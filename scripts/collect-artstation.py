#!/usr/bin/env python3
"""
Collecteur ArtStation pour le site infinition.

ArtStation est derriere Cloudflare : les endpoints .json repondent 403 a un
client HTTP ordinaire, navigateur compris. curl_cffi rejoue l empreinte TLS
de Chrome et passe. C est le meme principe que le collecteur de GitPulse,
reduit ici a ce que la galerie affiche : le profil, les creations, leurs
images et leurs compteurs. Aucun commentaire, aucune liste d abonnes.

La sortie est un instantane brut consomme ensuite par build-artstation.mjs.
Le script ne remplace jamais un instantane existant par une version vide :
en cas d echec il sort en code 1 et le build Node bascule sur le flux RSS.

Usage: python scripts/collect-artstation.py infinition --out .artstation-raw.json
"""

import argparse
import html
import json
import os
import sys
import time
from datetime import datetime, timezone

try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

try:
    from curl_cffi import requests
except ImportError:
    print("curl_cffi manquant, installer avec: pip install curl_cffi", file=sys.stderr)
    sys.exit(1)

BASE = "https://www.artstation.com"
IMPERSONATE = "chrome124"

# Nombre d images retenues par creation pour la visionneuse. Au dela la page
# devient lourde pour rien, la creation complete est a un clic sur ArtStation.
MAX_ASSETS = 8


def parse_args():
    p = argparse.ArgumentParser(description="Collecteur ArtStation du site infinition")
    p.add_argument("username", nargs="?", default="infinition", help="Nom d utilisateur ArtStation")
    p.add_argument("--out", default=".artstation-raw.json", help="Fichier d instantane a ecrire")
    p.add_argument("--delay", type=float, default=0.4, help="Tempo entre deux requetes, en secondes")
    p.add_argument("--max-pages", type=int, default=25, help="Garde-fou de pagination")
    return p.parse_args()


def fetch_json(session, url, delay):
    """Un seul essai par URL, avec tempo avant la requete. Cloudflare
    n aime pas les rafales et une erreur ici n est jamais fatale."""
    time.sleep(delay)
    try:
        res = session.get(url, impersonate=IMPERSONATE, timeout=20)
    except Exception as err:
        print(f"  requete en echec {url}: {err}", file=sys.stderr)
        return None

    if res.status_code == 200:
        try:
            return res.json()
        except Exception as err:
            print(f"  reponse illisible {url}: {err}", file=sys.stderr)
            return None

    print(f"  HTTP {res.status_code} sur {url}", file=sys.stderr)
    return None


def clean(value):
    """L API ArtStation renvoie du texte deja echappe en HTML,
    "3D &amp; 2D" par exemple. On le decode ici, une fois, plutot que
    dans chaque gabarit du site."""
    return html.unescape(value or "").strip()


def collect_profile(session, user, delay):
    data = fetch_json(session, f"{BASE}/users/{user}.json", delay)
    if not data or "username" not in data:
        return None

    city = clean(data.get("city"))
    country = clean(data.get("country"))
    skills = [s.get("name") for s in (data.get("skills") or []) if isinstance(s, dict) and s.get("name")]
    software = [
        {"name": s.get("name"), "icon": s.get("icon_url") or ""}
        for s in (data.get("software_items") or [])
        if isinstance(s, dict) and s.get("name")
    ]

    return {
        "id": data.get("id"),
        "username": data.get("username", user),
        "full_name": clean(data.get("full_name")),
        "headline": clean(data.get("headline")),
        "location": ", ".join([p for p in (city, country) if p]),
        "avatar_url": data.get("large_avatar_url") or data.get("medium_avatar_url") or "",
        # artstation_url pointe vers le sous domaine du portfolio, on
        # garde l URL canonique, la meme que partout ailleurs sur le site.
        "profile_url": f"{BASE}/{user}",
        "followers_count": data.get("followers_count") or 0,
        "following_count": data.get("followees_count") or 0,
        "projects_count": data.get("projects_count") or 0,
        "liked_projects_count": data.get("liked_projects_count") or 0,
        "pro_member": bool(data.get("pro_member")),
        "skills": skills,
        "software": software,
    }


def collect_projects(session, user, delay, max_pages, expected):
    """Liste paginee des creations. Les compteurs de vues et les images ne
    sont pas dans cette reponse, ils arrivent au detail."""
    projects = []
    page = 1

    while page <= max_pages:
        payload = fetch_json(session, f"{BASE}/users/{user}/projects.json?page={page}", delay)
        if not isinstance(payload, dict):
            break

        items = payload.get("data") or []
        if not items:
            break

        for item in items:
            cover = item.get("cover") or {}
            projects.append({
                "id": item.get("id"),
                "hash_id": clean(item.get("hash_id")),
                "slug": clean(item.get("slug")),
                "title": clean(item.get("title")) or "Untitled",
                "description": clean(item.get("description")),
                "published_at": item.get("published_at") or item.get("created_at") or "",
                "likes_count": item.get("likes_count") or 0,
                "views_count": 0,
                "comments_count": 0,
                "assets_count": item.get("assets_count") or 0,
                "permalink": item.get("permalink") or f"{BASE}/artwork/{clean(item.get('hash_id'))}",
                "thumb_url": cover.get("thumb_url") or cover.get("small_square_url") or "",
                "cover_url": cover.get("small_square_url") or cover.get("thumb_url") or "",
                "image_url": "",
                "width": 0,
                "height": 0,
                "tags": [],
                "software": [],
                "images": [],
            })

        if expected and len(projects) >= expected:
            break
        page += 1

    return projects


def enrich_project(session, project, delay):
    """Detail d une creation : vues, images pleine taille, logiciels, tags."""
    hash_id = project.get("hash_id")
    if not hash_id:
        return project

    detail = fetch_json(session, f"{BASE}/projects/{hash_id}.json", delay)
    if not isinstance(detail, dict):
        return project

    project["views_count"] = detail.get("views_count") or 0
    project["likes_count"] = detail.get("likes_count") or project["likes_count"]
    project["comments_count"] = detail.get("comments_count") or 0
    project["cover_url"] = detail.get("cover_url") or project["cover_url"]
    project["tags"] = [t for t in (detail.get("tags") or []) if isinstance(t, str)][:12]
    project["software"] = [
        s.get("name") for s in (detail.get("software_items") or [])
        if isinstance(s, dict) and s.get("name")
    ]

    images = []
    for asset in detail.get("assets") or []:
        if not isinstance(asset, dict):
            continue
        url = asset.get("image_url")
        # Les assets video et les lecteurs embarques n ont pas d image fixe.
        if not url or asset.get("has_embedded_player"):
            continue
        images.append({
            "url": url,
            "width": asset.get("width") or 0,
            "height": asset.get("height") or 0,
            "type": asset.get("asset_type") or "image",
        })
        if len(images) >= MAX_ASSETS:
            break

    project["images"] = images
    if images:
        project["image_url"] = images[0]["url"]
        project["width"] = images[0]["width"]
        project["height"] = images[0]["height"]

    return project


def main():
    args = parse_args()
    user = args.username.strip().lower()
    session = requests.Session()

    profile = collect_profile(session, user, args.delay)
    if not profile:
        print(f"Profil ArtStation introuvable pour {user}", file=sys.stderr)
        sys.exit(1)

    projects = collect_projects(session, user, args.delay, args.max_pages, profile["projects_count"])
    if not projects:
        print("Aucune creation recuperee", file=sys.stderr)
        sys.exit(1)

    for project in projects:
        enrich_project(session, project, args.delay)

    projects.sort(key=lambda p: p.get("published_at") or "", reverse=True)

    snapshot = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "api",
        "username": user,
        "profile": profile,
        "projects": projects,
        "totals": {
            "projects": len(projects),
            "likes": sum(p.get("likes_count") or 0 for p in projects),
            "views": sum(p.get("views_count") or 0 for p in projects),
            "followers": profile["followers_count"],
        },
    }

    out_dir = os.path.dirname(os.path.abspath(args.out))
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as handle:
        json.dump(snapshot, handle, ensure_ascii=False, indent=2)

    totals = snapshot["totals"]
    print(f"{totals['projects']} creations, {totals['likes']} likes, "
          f"{totals['views']} vues, {totals['followers']} abonnes")


if __name__ == "__main__":
    main()
