import requests
import os
import math
import re
import sys

# --- Configuration ---
USERNAME = "infinition"
README_PATH = "README.md"

# URLs des icônes
ICON_WEB = "https://img.icons8.com/ios-filled/50/4a90e2/internet.png"
ICON_GIT = "https://img.icons8.com/ios-glyphs/30/FFFFFF/github.png"
ICON_OBSIDIAN = "https://img.icons8.com/ios-filled/50/8250df/box.png"
ICON_VSCODE = "https://img.icons8.com/ios-filled/50/0078d7/visual-studio-code-2019.png"

def get_repos():
    print(f"--- Démarrage de la récupération des repos pour {USERNAME} ---")
    url = f"https://api.github.com/users/{USERNAME}/repos?per_page=100"
    headers = {}
    token = os.getenv("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"token {token}"
        print("✅ Token GitHub détecté.")
    else:
        print("⚠️ Aucun token GitHub trouvé (risque de rate-limit).")
    
    repos = []
    page = 1
    max_pages = 20
    
    while page <= max_pages:
        try:
            print(f"📡 Récupération page {page}...")
            r = requests.get(f"{url}&page={page}", headers=headers, timeout=20)
            
            if r.status_code != 200:
                print(f"❌ Erreur API: {r.status_code} - {r.text}")
                break
            
            data = r.json()
            if not data:
                print("✅ Fin des pages (liste vide reçue).")
                break
                
            repos.extend(data)
            print(f"   -> {len(data)} repos trouvés sur cette page.")
            page += 1
        except Exception as e:
            print(f"❌ Exception critique réseau : {e}")
            break
            
    print(f"--- Total: {len(repos)} dépôts récupérés ---")
    return repos

def check_vscode_release(repo_name):
    """Vérifie si le repo contient VSCode dans son release.yml"""
    url = f"https://api.github.com/repos/{USERNAME}/{repo_name}/contents/.github/workflows/release.yml"
    headers = {}
    token = os.getenv("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"token {token}"
    
    try:
        r = requests.get(url, headers=headers, timeout=10)
        if r.status_code == 200:
            data = r.json()
            import base64
            content = base64.b64decode(data["content"]).decode("utf-8")
            return "vscode" in content.lower()
    except:
        pass
    return False

def filter_repos(repos):
    print("⚙️ Filtrage et tri des dépôts...")
    own_repos = [r for r in repos if not r.get("fork")]
    
    obsidian_repos = []
    vscode_repos = []
    live_repos = []
    other_repos = []

    priority = ["infinition", "Bjorn"]

    for repo in own_repos:
        name = repo["name"]
        
        # Vérifier VSCode en premier
        if check_vscode_release(name):
            print(f"   🔵 VSCode détecté: {name}")
            vscode_repos.append(repo)
        elif name.lower().startswith("obsidian-"):
            obsidian_repos.append(repo)
        elif repo.get("has_pages"):
            live_repos.append(repo)
        elif name != USERNAME:
            other_repos.append(repo)

    # Tris
    live_repos.sort(key=lambda x: (priority.index(x["name"]) if x["name"] in priority else 999, x["name"].lower()))
    vscode_repos.sort(key=lambda x: x["name"].lower())
    obsidian_repos.sort(key=lambda x: x["name"].lower())
    other_repos.sort(key=lambda x: x["name"].lower())

    return live_repos, vscode_repos, obsidian_repos, other_repos

def make_table(repos, category="other"):
    if not repos:
        return ""

    # Pour les extensions/plugins : une ligne par repo avec description
    if category in ["vscode", "obsidian"]:
        html = '<table width="100%">\n'
        for repo in repos:
            name = repo["name"]
            repo_url = repo["html_url"]
            description = repo.get("description", "")
            
            # Crop la description à 80 caractères
            if description and len(description) > 80:
                description = description[:77] + "..."
            elif not description:
                description = "<em>No description</em>"
            
            html += '  <tr>\n'
            html += '    <td width="5%" align="center">\n'
            
            if category == "vscode":
                html += f'      <a href="{repo_url}"><img src="{ICON_VSCODE}" width="24" alt="VSCode"/></a>\n'
            else:  # obsidian
                if repo.get("has_pages"):
                    site_url = f"https://{USERNAME}.github.io/{name}/"
                    html += f'      <a href="{site_url}"><img src="{ICON_WEB}" width="24" alt="Web"/></a>\n'
                else:
                    html += f'      <a href="{repo_url}"><img src="{ICON_OBSIDIAN}" width="24" alt="Obsidian"/></a>\n'
            
            html += '    </td>\n'
            html += '    <td width="25%">\n'
            html += f'      <strong><a href="{repo_url}">{name}</a></strong>\n'
            html += '    </td>\n'
            html += '    <td width="65%">\n'
            html += f'      {description}\n'
            html += '    </td>\n'
            html += f'    <td width="5%" align="center">\n'
            html += f'      <a href="{repo_url}"><img src="{ICON_GIT}" width="20" alt="Git"/></a>\n'
            html += '    </td>\n'
            html += '  </tr>\n'
        html += '</table>'
        return html
    
    # Pour les autres : grille 3 colonnes comme avant
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
                
                if category == "live":
                    site_url = f"https://{USERNAME}.github.io/" if name == f"{USERNAME}.github.io" else f"https://{USERNAME}.github.io/{name}/"
                    html += f'      <a href="{site_url}"><img align="left" src="{ICON_WEB}" width="17" alt="Web"/></a>\n'
                    html += f'      <a href="{repo_url}"><img align="right" src="{ICON_GIT}" width="19" alt="Git"/></a>\n'
                else:
                    html += f'      <a href="{repo_url}"><img align="left" src="{ICON_GIT}" width="19" alt="Git"/></a>\n'

                html += f'      <center><code>{name}</code></center>\n'
                html += '    </td>\n'
            else:
                html += '    <td align="center">✨</td>\n'
        html += "  </tr>\n"
    html += "</table>"
    return html

def update_readme():
    repos = get_repos()
    if not repos:
        print("❌ Aucun dépôt récupéré. Arrêt.")
        sys.exit(1)

    live, vscode, obsidian, other = filter_repos(repos)
    print(f"📊 Stats: Live={len(live)}, VSCode={len(vscode)}, Obsidian={len(obsidian)}, Other={len(other)}")

    try:
        with open(README_PATH, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        print(f"❌ Erreur lecture README: {e}")
        sys.exit(1)

    # Patterns avec balises de commentaires HTML
    replacements = [
        (r'(<!-- AUTO_LIVE_START -->)([\s\S]*?)(<!-- AUTO_LIVE_END -->)', 
         make_table(live, "live"), "Live Deployments"),
        (r'(<!-- AUTO_VSCODE_START -->)([\s\S]*?)(<!-- AUTO_VSCODE_END -->)', 
         make_table(vscode, "vscode"), "VSCode Extensions"),
        (r'(<!-- AUTO_OBSIDIAN_START -->)([\s\S]*?)(<!-- AUTO_OBSIDIAN_END -->)', 
         make_table(obsidian, "obsidian"), "Obsidian Extensions"),
        (r'(<!-- AUTO_OTHER_START -->)([\s\S]*?)(<!-- AUTO_OTHER_END -->)', 
         make_table(other, "other"), "Other Repos")
    ]

    changes_made = False
    for pattern, new_html, name in replacements:
        if re.search(pattern, content):
            print(f"✅ Marqueurs trouvés pour : {name}. Mise à jour...")
            content = re.sub(pattern, f"\\1\n{new_html}\n\\3", content)
            changes_made = True
        else:
            print(f"⚠️ Marqueurs NON trouvés pour : {name}. Vérifie ton README !")

    if changes_made:
        with open(README_PATH, "w", encoding="utf-8") as f:
            f.write(content)
        print("🎉 README mis à jour avec succès !")
    else:
        print("⚠️ Aucune modification effectuée (balises manquantes ?).")

if __name__ == "__main__":
    update_readme()
