import requests
import os
import math
import re

# --- Configuration ---
USERNAME = "infinition"
README_PATH = "README.md"

# URLs des icônes
ICON_WEB = "https://img.icons8.com/ios-filled/50/4a90e2/internet.png"
ICON_GIT = "https://img.icons8.com/ios-glyphs/30/FFFFFF/github.png"
ICON_OBSIDIAN = "https://img.icons8.com/ios-filled/50/8250df/box.png" 

def get_repos():
    url = f"https://api.github.com/users/{USERNAME}/repos?per_page=100"
    headers = {}
    token = os.getenv("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"token {token}"
    
    repos = []
    page = 1
    while True:
        try:
            r = requests.get(f"{url}&page={page}", headers=headers)
            if r.status_code != 200: break
            data = r.json()
            if not data: break
            repos.extend(data)
            page += 1
        except Exception as e:
            print(f"Erreur: {e}")
            break
    return repos

def filter_repos(repos):
    # 1. Ignorer les forks
    own_repos = [r for r in repos if not r.get("fork")]
    
    # 2. Séparation
    obsidian_repos = []
    live_repos = []
    other_repos = []

    priority = ["infinition", "Bjorn"] # Priorité pour l'affichage Live

    for repo in own_repos:
        name = repo["name"]
        
        # C'est du Obsidian ?
        if name.lower().startswith("obsidian-"):
            obsidian_repos.append(repo)
        
        # C'est un déploiement Web (non obsidian) ?
        elif repo.get("has_pages"):
            live_repos.append(repo)
        
        # C'est le reste (sauf le repo special du profil)
        elif name != USERNAME:
            other_repos.append(repo)

    # 3. Tri
    # Live : Priorité d'abord, puis alphabétique
    live_repos.sort(key=lambda x: (priority.index(x["name"]) if x["name"] in priority else 999, x["name"].lower()))
    
    # Obsidian & Autres : Alphabétique
    obsidian_repos.sort(key=lambda x: x["name"].lower())
    other_repos.sort(key=lambda x: x["name"].lower())

    return live_repos, obsidian_repos, other_repos

def make_table(repos, category="other"):
    if not repos:
        return ""

    html = '<table width="100%">\n'
    cols = 3
    rows = math.ceil(len(repos) / cols)

    for r in range(rows):
        html += "  <tr>\n"
        for c in range(cols):
            idx = r * cols + c
            if idx < len(repos):
                repo = repos[idx]
                name = repo["name"]
                repo_url = repo["html_url"]
                
                html += '    <td width="33%">\n'
                
                # Logique d'icônes
                if category == "live":
                    # Pour Live: Web à gauche, Git à droite
                    site_url = f"https://{USERNAME}.github.io/" if name == f"{USERNAME}.github.io" else f"https://{USERNAME}.github.io/{name}/"
                    html += f'      <a href="{site_url}"><img align="left" src="{ICON_WEB}" width="17" alt="Web"/></a>\n'
                    html += f'      <a href="{repo_url}"><img align="right" src="{ICON_GIT}" width="19" alt="Git"/></a>\n'
                
                elif category == "obsidian":
                    # Pour Obsidian: Box violette à gauche (ou Web si dispo), Git à droite
                    if repo.get("has_pages"):
                         site_url = f"https://{USERNAME}.github.io/{name}/"
                         html += f'      <a href="{site_url}"><img align="left" src="{ICON_WEB}" width="17" alt="Web"/></a>\n'
                    else:
                         html += f'      <a href="{repo_url}"><img align="left" src="{ICON_OBSIDIAN}" width="19" alt="Obsidian"/></a>\n'
                    html += f'      <a href="{repo_url}"><img align="right" src="{ICON_GIT}" width="19" alt="Git"/></a>\n'
                
                else:
                    # Pour Autres: Git à gauche
                    html += f'      <a href="{repo_url}"><img align="left" src="{ICON_GIT}" width="19" alt="Git"/></a>\n'

                html += f'      <center><code>{name}</code></center>\n'
                html += '    </td>\n'
            else:
                html += '    <td align="center">✨</td>\n'
        html += "  </tr>\n"
    html += "</table>"
    return html

def update_readme():
    print("Fetching repos...")
    repos = get_repos()
    live, obsidian, other = filter_repos(repos)
    
    print(f"Stats: Live={len(live)}, Obsidian={len(obsidian)}, Other={len(other)}")

    try:
        with open(README_PATH, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception:
        print("README not found!")
        return

    # Mises à jour via Regex strictes
    replacements = [
        (r'()[\s\S]*?()', make_table(live, "live")),
        (r'()[\s\S]*?()', make_table(obsidian, "obsidian")),
        (r'()[\s\S]*?()', make_table(other, "other"))
    ]

    for pattern, new_html in replacements:
        if re.search(pattern, content):
            content = re.sub(pattern, f"\\1\n{new_html}\n\\2", content)
        else:
            print(f"⚠️ Marker not found for pattern: {pattern}")

    with open(README_PATH, "w", encoding="utf-8") as f:
        f.write(content)
    print("✅ README updated!")

if __name__ == "__main__":
    update_readme()
