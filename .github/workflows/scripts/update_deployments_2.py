import requests
import os
import math
import re  # Important pour la détection sans marqueurs #test

# --- Configuration ---
USERNAME = "infinition"
README_PATH = "README.md"

# URLs des icônes
ICON_WEB = "https://img.icons8.com/ios-filled/50/4a90e2/internet.png"
ICON_GIT = "https://img.icons8.com/ios-glyphs/30/FFFFFF/github.png"

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
    """Filtre et trie : Favoris en premier, le reste par ordre alphabétique."""
    pages_repos = [r for r in repos if r.get("has_pages")]
    other_repos = [r for r in repos if not r.get("has_pages") and r["name"] != USERNAME]
    
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
    
    other_repos.sort(key=lambda x: x["name"].lower())

    return top_repos + remaining_pages, other_repos

def generate_html_table(repos):
    """Génère le tableau HTML."""
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

def generate_repo_list(repos):
    """Génère une liste Markdown des dépôts."""
    if not repos:
        return "No other repositories found."
    
    lines = []
    for repo in repos:
        name = repo["name"]
        url = repo["html_url"]
        desc = repo["description"] or "No description"
        lines.append(f"- [**{name}**]({url}) - {desc}")
    
    return "\n".join(lines)

def update_readme():
    """Lit le README, injecte le nouveau tableau et la liste via REGEX."""
    print("Récupération des dépôts...")
    repos = get_repos()
    print(f"{len(repos)} dépôts trouvés au total.")
    
    sorted_pages, other_repos = filter_and_sort_repos(repos)
    print(f"{len(sorted_pages)} dépôts avec GitHub Pages actifs.")
    print(f"{len(other_repos)} autres dépôts.")
    
    new_html_block = generate_html_table(sorted_pages)
    new_repo_list = generate_repo_list(other_repos)

    try:
        with open(README_PATH, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        print("Erreur: README.md introuvable à la racine !")
        return

    # 1. Mise à jour du tableau Live Deployments
    pattern_table = r'(<div align="center">\s*\n*\s*### 🌐 Live Deployments[\s\S]*?</table>\s*\n*\s*</div>)'
    if re.search(pattern_table, content):
        print("Mise à jour du tableau Live Deployments...")
        content = re.sub(pattern_table, new_html_block, content, count=1)
    
    # 2. Mise à jour de la liste des autres dépôts
    pattern_list = r'(<!-- REPO_LIST_START -->)[\s\S]*?(<!-- REPO_LIST_END -->)'
    if re.search(pattern_list, content):
        print("Mise à jour de la liste des dépôts...")
        replacement = f"\\1\n{new_repo_list}\n\\2"
        content = re.sub(pattern_list, replacement, content, count=1)
        
    with open(README_PATH, "w", encoding="utf-8") as f:
        f.write(content)
    print("✅ README mis à jour avec succès.")

if __name__ == "__main__":
    update_readme()

