import requests
import os
import math

# --- Configuration ---
USERNAME = "infinition"
README_PATH = "README.md"
# Marqueurs pour savoir où injecter le tableau dans le README
START_MARKER = ""
END_MARKER = ""

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
    # Garder uniquement ceux avec GitHub Pages activé
    pages_repos = [r for r in repos if r.get("has_pages")]

    # Définir l'ordre de priorité exact
    priority = ["infinition", "Bjorn"]
    
    top_repos = []
    other_repos = []

    for repo in pages_repos:
        if repo["name"] in priority:
            top_repos.append(repo)
        else:
            other_repos.append(repo)

    # 1. Trier les prioritaires selon l'ordre de la liste 'priority'
    top_repos.sort(key=lambda x: priority.index(x["name"]))
    
    # 2. Trier les autres par ordre ALPHABÉTIQUE (insensible à la casse)
    other_repos.sort(key=lambda x: x["name"].lower())

    return top_repos + other_repos

def generate_html_table(repos):
    """Génère le tableau HTML avec le style spécifique (Icons Left/Right, Center Text)."""
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
                
                # Définition de l'URL du site
                if repo["name"].lower() == f"{USERNAME}.github.io".lower():
                    site_url = f"https://{USERNAME}.github.io/"
                else:
                    site_url = f"https://{USERNAME}.github.io/{repo['name']}/"
                
                repo_url = repo["html_url"]
                name = repo["name"]

                # Construction de la cellule
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
                # Cellule vide avec l'étoile
                html += '    <td align="center">✨</td>\n'
        
        html += "  </tr>\n"
    
    html += "</table>\n\n"
    html += "</div>"
    return html

def update_readme():
    """Lit le README, injecte le nouveau tableau et sauvegarde."""
    print("Récupération des dépôts...")
    repos = get_repos()
    print(f"{len(repos)} dépôts trouvés au total.")
    
    sorted_repos = filter_and_sort_repos(repos)
    print(f"{len(sorted_repos)} dépôts avec GitHub Pages actifs.")
    
    new_table = generate_html_table(sorted_repos)

    try:
        with open(README_PATH, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        print("Erreur: README.md introuvable à la racine !")
        return

    # Vérification des marqueurs
    if START_MARKER in content and END_MARKER in content:
        print("Marqueurs trouvés, mise à jour en cours...")
        pre = content.split(START_MARKER)[0]
        post = content.split(END_MARKER)[1]
        
        new_content = pre + START_MARKER + "\n" + new_table + "\n" + END_MARKER + post
        
        with open(README_PATH, "w", encoding="utf-8") as f:
            f.write(new_content)
        print("✅ README mis à jour avec succès.")
    else:
        print("⚠️ Marqueurs introuvables dans le README.")
        print(f"Veuillez ajouter {START_MARKER} et {END_MARKER} autour de votre tableau dans README.md")

if __name__ == "__main__":
    update_readme()
