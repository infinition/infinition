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
# Nouvelle icône violette pour Obsidian
ICON_OBSIDIAN = "https://img.icons8.com/ios-filled/50/8250df/box.png" 

def get_repos():
    """Récupère les repos de l'utilisateur via l'API GitHub."""
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
            if r.status_code != 200:
                print(f"Erreur API: {r.status_code}")
                break
            data = r.json()
            if not data:
                break
            repos.extend(data)
            page += 1
        except Exception as e:
            print(f"Erreur connexion: {e}")
            break
    return repos

def filter_and_sort_repos(repos):
    """Filtre en 3 catégories : Obsidian, Live (sans obsidian), et Autres."""
    
    # 1. Ignorer les forks
    own_repos = [r for r in repos if not r.get("fork")]
    
    # 2. Extraire les repos Obsidian (commence par 'obsidian-')
    obsidian_repos = [r for r in own_repos if r["name"].lower().startswith("obsidian-")]
    
    # 3. Extraire les Live Deployments (ceux qui restent et qui ont des pages)
    # On exclut ceux qui sont déjà dans obsidian_repos pour éviter les doublons
    pages_repos = [r for r in own_repos if r.get("has_pages") and r not in obsidian_repos]
    
    # 4. Le reste (Autres repos)
    other_repos = [r for r in own_repos if r not in obsidian_repos and r not in pages_repos and r["name"] != USERNAME]
    
    # --- Tri ---
    
    # Tri Live Deployments (Favoris en premier)
    priority = ["infinition", "Bjorn"]
    top_repos = []
    remaining_pages = []

    for repo in pages_repos:
        if repo["name"] in priority:
            top_repos.append(repo)
        else:
            remaining_pages.append(repo)

    top_repos.sort(key=lambda x: priority.index(x["name"]))
    remaining_pages.sort(key=lambda x: x["name"].lower())
    sorted_pages = top_repos + remaining_pages

    # Tri Obsidian (Alphabétique)
    obsidian_repos.sort(key=lambda x: x["name"].lower())

    # Tri Autres (Alphabétique)
    other_repos.sort(key=lambda x: x["name"].lower())

    return sorted_pages, obsidian_repos, other_repos

def generate_html_table(repos):
    """Génère le tableau HTML pour Live Deployments."""
    if not repos:
        return "No deployments found."

    html = '<div align="center">\n\n'
    html += '### 🌐 Live Deployments\n\n'
    html += '<table width="100%">\n'
    
    cols = 3
    rows = math.ceil(len(repos) / cols)

    for r in range(rows):
        html += "  <tr>\n"
        for c in range(cols):
            idx = r * cols + c
            if idx < len(repos):
                repo = repos[idx]
                
                # URL du site
                if repo["name"].lower() == f"{USERNAME}.github.io".lower():
                    site_url = f"https://{USERNAME}.github.io/"
                else:
                    site_url = f"https://{USERNAME}.github.io/{repo['name']}/"
                
                repo_url = repo["html_url"]
                name = repo["name"]

                html += '    <td width="33%">\n'
                html += f'      <a href="{site_url}">\n'
                html += f'        <img align="left" src="{ICON_WEB}" width="17" alt="Web"/>\n'
                html += '      </a>\n'
                html += f'      <a href="{repo_url}">\n'
                html += f'        <img align="right" src="{ICON_GIT}" width="19" alt="Git"/>\n'
                html += '      </a>\n'
                html += f'      <center><code>{name}</code></center>\n'
                html += '    </td>\n'
            else:
                html += '    <td align="center">✨</td>\n'
        
        html += "  </tr>\n"
    
    html += "</table>\n\n"
    html += "</div>"
    return html

def generate_obsidian_table(repos):
    """Génère le tableau HTML pour les extensions Obsidian."""
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
                repo_url = repo["html_url"]
                name = repo["name"]
                
                # Petite logique : Si le repo Obsidian a AUSSI une page web, on met l'icône Web à gauche
                has_web = repo.get("has_pages")
                
                html += '    <td width="33%">\n'
                
                if has_web:
                    site_url = f"https://{USERNAME}.github.io/{repo['name']}/"
                    html += f'      <a href="{site_url}">\n'
                    html += f'        <img align="left" src="{ICON_WEB}" width="17" alt="Web"/>\n'
                    html += '      </a>\n'
                else:
                    # Sinon juste l'icône Obsidian à gauche pour le style
                    html += f'      <a href="{repo_url}">\n'
                    html += f'        <img align="left" src="{ICON_OBSIDIAN}" width="19" alt="Obsidian"/>\n'
                    html += '      </a>\n'

                html += f'      <a href="{repo_url}">\n'
                html += f'        <img align="right" src="{ICON_GIT}" width="19" alt="Git"/>\n'
                html += '      </a>\n'
                html += f'      <center><code>{name}</code></center>\n'
                html += '    </td>\n'
            else:
                html += '    <td align="center">✨</td>\n'
        
        html += "  </tr>\n"
    
    html += "</table>"
    return html

def generate_repo_list(repos):
    """Génère un tableau HTML pour les autres dépôts."""
    if not repos:
        return "No other repositories found."
    
    html = '<table width="100%">\n'
    
    cols = 3
    rows = math.ceil(len(repos) / cols)

    for r in range(rows):
        html += "  <tr>\n"
        for c in range(cols):
            idx = r * cols + c
            if idx < len(repos):
                repo = repos[idx]
                repo_url = repo["html_url"]
                name = repo["name"]

                html += '    <td width="33%">\n'
                html += f'      <a href="{repo_url}">\n'
                html += f'        <img align="left" src="{ICON_GIT}" width="19" alt="Git"/>\n'
                html += '      </a>\n'
                html += f'      <center><code>{name}</code></center>\n'
                html += '    </td>\n'
            else:
                html += '    <td align="center">✨</td>\n'
        
        html += "  </tr>\n"
    
    html += "</table>"
    return html

def update_readme():
    """Lit le README, injecte les tableaux via REGEX."""
    print("Récupération des dépôts...")
    repos = get_repos()
    print(f"{len(repos)} dépôts trouvés au total.")
    
    sorted_pages, obsidian_repos, other_repos = filter_and_sort_repos(repos)
    print(f"{len(sorted_pages)} dépôts Live.")
    print(f"{len(obsidian_repos)} extensions Obsidian.")
    print(f"{len(other_repos)} autres dépôts.")
    
    new_live_block = generate_html_table(sorted_pages)
    new_obsidian_block = generate_obsidian_table(obsidian_repos)
    new_other_block = generate_repo_list(other_repos)

    try:
        with open(README_PATH, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        print("Erreur: README.md introuvable à la racine !")
        return

    # 1. Mise à jour du tableau Live Deployments (Pattern existant)
    pattern_table = r'(<div align="center">\s*\n*\s*### 🌐 Live Deployments[\s\S]*?</table>\s*\n*\s*</div>)'
    if re.search(pattern_table, content):
        print("Mise à jour du tableau Live Deployments...")
        content = re.sub(pattern_table, new_live_block, content, count=1)
    
    # 2. Mise à jour du tableau Obsidian (NOUVEAU PATTERN)
    pattern_obsidian = r'()[\s\S]*?()'
    if re.search(pattern_obsidian, content):
        print("Mise à jour du tableau Obsidian...")
        replacement = f"\\1\n{new_obsidian_block}\n\\2"
        content = re.sub(pattern_obsidian, replacement, content, count=1)
    else:
        print("⚠️ Attention : balises non trouvées dans le README.")

    # 3. Mise à jour de la liste des autres dépôts (Pattern existant)
    pattern_list = r'()[\s\S]*?()'
    if re.search(pattern_list, content):
        print("Mise à jour de la liste des autres dépôts...")
        replacement = f"\\1\n{new_other_block}\n\\2"
        content = re.sub(pattern_list, replacement, content, count=1)
        
    with open(README_PATH, "w", encoding="utf-8") as f:
        f.write(content)
    print("✅ README mis à jour avec succès.")

if __name__ == "__main__":
    update_readme()
