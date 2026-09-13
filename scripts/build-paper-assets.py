#!/usr/bin/env python3
"""
Ce que la premiere page d un PDF fournit a la vue LIBRARY :

  - la couverture. Une bibliotheque sans couverture n en est pas une, et
    plutot que d inventer une jaquette on montre la page de titre telle
    qu elle est, comme le ferait Calibre avec un livre numerique.
  - pour un preprint hors arXiv, son resume. arXiv le fournit pour ses
    publications, un PDF depose ailleurs non, et le lire dans le document
    evite de recopier a la main un texte qui se perime. Le titre reste
    dans la graine : il tient souvent sur deux lignes, parfois suivi d un
    sous-titre, et aucune heuristique ne tranche cela proprement.

Les deux travaux sont ici parce qu ils lisent la meme page du meme PDF, une
seule fois.

Le rendu passe par pypdfium2, le moteur PDF de Chrome empaquete en roue
precompilee : aucune dependance systeme a installer, ni ici ni sur le runner,
et les polices standard sont toutes gerees, contrairement aux moteurs de
rendu par navigateur prives de DOM.

Le nom de la couverture porte la version arXiv. Une image deja rendue n est
donc jamais refaite, une nouvelle version du papier produit d office une
nouvelle image, et les fichiers qui ne correspondent plus a rien sont effaces.

Usage: python scripts/build-paper-assets.py [--papers data/papers.json]
                                            [--out-dir assets/papers]
"""

import argparse
import io
import json
import os
import re
import sys
import urllib.error
import urllib.request

try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

try:
    import pypdfium2 as pdfium
    from PIL import Image
except ImportError as err:
    print(f"dependance manquante ({err}), installer avec: pip install pypdfium2 pillow",
          file=sys.stderr)
    sys.exit(1)

UA = "infinition-site-papers/1.0 (+https://infinition.github.io/infinition/)"

# La couverture est affichee dans une case de 190 px environ, rendue ici en
# 640 px de large pour rester nette sur un ecran a forte densite.
COVER_WIDTH = 640
COVER_RATIO = 3 / 4
COVER_HEIGHT = round(COVER_WIDTH / COVER_RATIO)

# Une page lettre a un rapport de 0.773, une A4 de 0.707 : les deux sont plus
# etroites que la case. On complete donc en blanc, invisible sur le fond de la
# page, plutot que de rogner le titre.
PAGE_BACKGROUND = (255, 255, 255)


def parse_args():
    p = argparse.ArgumentParser(description="Couvertures et metadonnees des publications")
    p.add_argument("--papers", default="data/papers.json", help="Index des publications")
    p.add_argument("--out-dir", default="assets/papers", help="Dossier des couvertures")
    p.add_argument("--quality", type=int, default=82, help="Qualite WebP")
    p.add_argument("--force", action="store_true", help="Refaire meme les couvertures existantes")
    return p.parse_args()


def cover_name(paper):
    """Le nom porte la version : v1 et v2 ne partagent pas la meme image."""
    return f"{paper['id']}{paper.get('version') or ''}.webp"


def load_pdf(source):
    """Un chemin local est lu tel quel, une URL est telechargee."""
    if not source.startswith(("http://", "https://")):
        with open(source, "rb") as handle:
            return handle.read()

    request = urllib.request.Request(source, headers={"User-Agent": UA})
    with urllib.request.urlopen(request, timeout=90) as response:
        return response.read()


def render_first_page(document):
    page = document[0]
    width = page.get_width()
    if not width:
        raise ValueError("page de largeur nulle")
    # On rend plus large que la cible, la reduction par Pillow lissant mieux
    # le texte qu un rendu direct a la taille finale.
    return page.render(scale=(COVER_WIDTH * 1.5) / width).to_pil().convert("RGB")


def fit_to_cover(page_image):
    """Reduit la page puis la centre sur un fond blanc au format de la case."""
    ratio = min(COVER_WIDTH / page_image.width, COVER_HEIGHT / page_image.height)
    size = (max(1, round(page_image.width * ratio)), max(1, round(page_image.height * ratio)))
    resized = page_image.resize(size, Image.LANCZOS)

    canvas = Image.new("RGB", (COVER_WIDTH, COVER_HEIGHT), PAGE_BACKGROUND)
    canvas.paste(resized, ((COVER_WIDTH - size[0]) // 2, (COVER_HEIGHT - size[1]) // 2))
    return canvas


def tidy(text):
    """Un PDF coupe ses lignes a la main : on recolle, en rendant leur mot
    aux cesures et en normalisant les espaces."""
    text = text.replace("­", "")
    text = re.sub(r"([a-z])-\n([a-z])", r"\1\2", text)
    return re.sub(r"\s+", " ", text.replace("\n", " ")).strip()


def extract_abstract(raw):
    """Entre le mot Abstract et la premiere section numerotee, ou les mots
    cles. Un PDF qui ne suit pas ce plan ne renvoie rien, et l appelant garde
    alors le texte deja en place plutot que d afficher n importe quoi."""
    start = re.search(r"^\s*abstract\s*$", raw, re.IGNORECASE | re.MULTILINE)
    if not start:
        start = re.search(r"\bAbstract[\s.:-]*", raw)
        if not start:
            return ""

    body = raw[start.end():]
    stop = re.search(
        r"\n\s*(?:\d+[.\s]+[A-Z]|Keywords?\b|Index Terms\b|CCS Concepts\b|1\s+Introduction\b)",
        body)
    if stop:
        body = body[:stop.start()]

    abstract = tidy(body)
    # Trop court, c est que la detection a mordu sur un titre de section.
    return abstract if len(abstract) > 160 else ""


def main():
    args = parse_args()

    with io.open(args.papers, encoding="utf-8") as handle:
        index = json.load(handle)

    papers = index.get("papers") or []
    if not papers:
        print("Aucune publication dans l index, rien a rendre.", file=sys.stderr)
        sys.exit(1)

    os.makedirs(args.out_dir, exist_ok=True)

    expected = set()
    rendered = kept = failed = enriched = 0

    for paper in papers:
        source = paper.get("pdf_url") or ""
        if not source:
            # Aucun PDF a montrer : la vue garde sa couverture typographique.
            paper.pop("cover", None)
            continue

        name = cover_name(paper)
        path = os.path.join(args.out_dir, name)
        expected.add(name)
        # Chemin relatif a la racine du site, servi tel quel par la page.
        paper["cover"] = f"{args.out_dir}/{name}".replace(os.sep, "/")

        # Un preprint hors arXiv n a ni titre ni resume de reference. Tant
        # que les siens ne viennent pas du PDF, il faut l ouvrir, meme quand
        # sa couverture est deja rendue.
        needs_text = (paper.get("status") == "pending"
                      and paper.get("abstract_source") != "pdf")
        if os.path.isfile(path) and not args.force and not needs_text:
            kept += 1
            continue

        try:
            document = pdfium.PdfDocument(io.BytesIO(load_pdf(source)))
        except (urllib.error.URLError, OSError, ValueError, pdfium.PdfiumError) as err:
            failed += 1
            print(f"  {paper['id']}: PDF illisible ({err})", file=sys.stderr)
            if not os.path.isfile(path):
                paper.pop("cover", None)
            continue

        try:
            if not os.path.isfile(path) or args.force:
                fit_to_cover(render_first_page(document)).save(
                    path, "WEBP", quality=args.quality, method=6)
                rendered += 1
                print(f"{name}: {os.path.getsize(path) // 1024} ko")

            if needs_text:
                raw = document[0].get_textpage().get_text_range()
                abstract = extract_abstract(raw)
                if abstract:
                    paper["abstract"] = abstract
                    # Le drapeau dit a build-papers.mjs que ce resume vient du
                    # document et merite d etre repris, au contraire d un
                    # texte de depart ecrit a la main.
                    paper["abstract_source"] = "pdf"
                    enriched += 1
                else:
                    print(f"  {paper['id']}: resume introuvable dans le PDF", file=sys.stderr)
        except (OSError, ValueError, pdfium.PdfiumError) as err:
            failed += 1
            print(f"  {paper['id']}: rendu impossible ({err})", file=sys.stderr)
            if not os.path.isfile(path):
                paper.pop("cover", None)
        finally:
            document.close()

    # Les couvertures d anciennes versions ne servent plus a rien.
    removed = 0
    for name in os.listdir(args.out_dir):
        if name.endswith(".webp") and name not in expected:
            os.remove(os.path.join(args.out_dir, name))
            removed += 1

    with io.open(args.papers, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(index, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    print(f"{rendered} couverture(s) rendue(s), {kept} conservee(s), "
          f"{removed} obsolete(s) effacee(s), {enriched} resume(s) lu(s), {failed} en echec")

    # Rien rendu, rien conserve et des echecs : la source est tombee. On le
    # signale, le site gardant alors les images deja commitees.
    if rendered == 0 and kept == 0 and failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
