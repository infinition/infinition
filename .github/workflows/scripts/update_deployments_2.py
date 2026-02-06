import requests
import os
import math
import re
import sys
import base64

# --- Configuration ---
USERNAME = "infinition"
README_PATH = "README.md"

# URLs des icônes
ICON_WEB = "https://img.icons8.com/ios-filled/50/4a90e2/internet.png"
ICON_GIT = "https://img.icons8.com/ios-glyphs/30/FFFFFF/github.png"
ICON_OBSIDIAN = "https://img.icons8.com/ios-filled/50/8250df/box.png"
ICON_VSCODE = "https://img.icons8.com/ios-filled/50/0078d7/visual-studio-code-2019.png"
ICON_DEFAULT = "https://img.icons8.com/ios-filled/50/888888/folder-invoices.png"

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

def get_repo_icon(repo_name):
    """Récupère la première image du README du repo"""
    url = f"https://api.github.com/repos/{USERNAME}/{repo_name}/readme"
    headers = {"Accept": "application/vnd.github.v3.raw"}
    token = os.getenv("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"token {token}"
    
    try:
        r = requests.get(url, headers=headers, timeout=10)
        if r.status_code == 200:
            readme_content = r.text
            
            # Chercher la première image markdown ou HTML
            # Format markdown: ![alt](url)
            md_match = re.search(r'!\[.*?\]\((https?://[^\)]+)\)', readme_content)
            if md_match:
                return md_match.group(1)
            
            # Format HTML: <img src="url"
            html_match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', readme_content)
            if html_match:
                img_url = html_match.group(1)
                # Si c'est un chemin relatif, construire l'URL complète
                if not img_url.startswith('http'):
                    img_url = f"https://raw.githubusercontent.com/{USERNAME}/{repo_name}/main/{img_url}"
                return img_url
    except Exception as e:
        print(f"   ⚠️ Impossible de récupérer l'icône pour {repo_name}: {e}")
    
    return ICON_DEFAULT

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

    # Format tableau ligne par ligne pour toutes les catégories
    html = '<table width="100%">\n'
    
    for repo in repos:
        name = repo["name"]
        repo_url = repo["html_url"]
        description = repo.get("description", "")
        
        # Description dynamique : pas de limite, elle prendra l'espace disponible
        if not description:
            description = "<em>No description</em>"
        
        # Récupérer l'icône du repo
        print(f"   🖼️ Récupération icône pour: {name}")
        repo_icon = get_repo_icon(name)
        
        html += '  <tr>\n'
        
        # Colonne 1: Icône du repo - hauteur exacte 65px, largeur auto pour garder le ratio
        html += '    <td width="8%" align="center" style="padding: 2px;">\n'
        html += f'      <img src="{repo_icon}" height="65" style="max-width: calc(100% - 4px); object-fit: contain;" alt="{name} icon"/>\n'
        html += '    </td>\n'
        
        # Colonne 2: Icône de catégorie
        html += '    <td width="5%" align="center" style="padding: 2px;">\n'
        
        if category == "live":
            site_url = f"https://{USERNAME}.github.io/" if name == f"{USERNAME}.github.io" else f"https://{USERNAME}.github.io/{name}/"
            html += f'      <a href="{site_url}"><img src="{ICON_WEB}" width="28" alt="Web"/></a>\n'
        elif category == "vscode":
            # Pour VSCode : icône GitHub, pas VSCode
            html += f'      <a href="{repo_url}"><img src="{ICON_GIT}" width="28" alt="Git"/></a>\n'
        elif category == "obsidian":
            if repo.get("has_pages"):
                site_url = f"https://{USERNAME}.github.io/{name}/"
                html += f'      <a href="{site_url}"><img src="{ICON_WEB}" width="28" alt="Web"/></a>\n'
            else:
                html += f'      <a href="{repo_url}"><img src="{ICON_OBSIDIAN}" width="28" alt="Obsidian"/></a>\n'
        else:
            html += f'      <a href="{repo_url}"><img src="{ICON_GIT}" width="28" alt="Git"/></a>\n'
        
        html += '    </td>\n'
        
        # Colonne 3: Nom du repo
        html += '    <td width="20%" style="padding: 2px;">\n'
        html += f'      <strong><a href="{repo_url}">{name}</a></strong>\n'
        html += '    </td>\n'
        
        # Colonne 4: Description - prend tout l'espace disponible
        html += '    <td style="padding: 2px;">\n'
        html += f'      {description}\n'
        html += '    </td>\n'
        
        # Colonne 5: Lien GitHub
        html += f'    <td width="5%" align="center" style="padding: 2px;">\n'
        html += f'      <a href="{repo_url}"><img src="{ICON_GIT}" width="24" alt="Git"/></a>\n'
        html += '    </td>\n'
        
        html += '  </tr>\n'
    
    html += '</table>'
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
