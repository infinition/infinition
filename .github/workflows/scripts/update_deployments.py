import requests
import os
import math

# --- Configuration ---
USERNAME = "infinition"
README_PATH = "README.md"
START_MARKER = ""
END_MARKER = ""

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
    """Filtre pour garder uniquement les pages et trie selon tes préférences."""
    # Garder uniquement ceux avec GitHub Pages activé
    pages_repos = [r for r in repos if r.get("has_pages")]

    # Définir l'ordre de priorité exact demandé
    priority = ["infinition", "Bjorn"]
    
    top_repos = []
    other_repos = []

    for repo in pages_repos:
        if repo["name"] in priority:
            top_repos.append(repo)
        else:
            other_repos.append(repo)

    # Trier les prioritaires : Infinition d'abord, Bjorn ensuite
    top_repos.sort(key=lambda x: priority.index(x["name"]) if x["name"] in priority else 999)
    
    # Trier les autres par date de mise à jour (plus récent en premier)
    other_repos.sort(key=lambda x: x["updated_at"], reverse=True)

    return top_repos + other_repos

def generate_html_table(repos):
    """Génère le tableau HTML."""
    if not repos:
        return "No deployments found."

    html = "<table>\n"
    cols = 3
    rows = math.ceil(len(repos) / cols)

    for r in range(rows):
        html += "  <tr>\n"
        for c in range(cols):
            idx = r * cols + c
            if idx < len(repos):
                repo = repos[idx]
                # L'URL du site
                if repo["name"].lower() == f"{USERNAME}.github.io".lower():
                    site_url = f"https://{USERNAME}.github.io/"
                else:
                    site_url = f"https://{USERNAME}.github.io/{repo['name']}/"
                
                html += f'    <td align="center"><a href="{site_url}"><code>{repo["name"]}</code></a></td>\n'
            else:
                html += '    <td align="center">✨</td>\n' # Cellule vide de remplissage
        html += "  </tr>\n"
    html += "</table>"
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

    # Vérification stricte que les marqueurs ne sont pas vides
    if not START_MARKER or not END_MARKER:
        print("Erreur critique: Les marqueurs sont vides dans le script.")
        return

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
        print(f"Assurez-vous que '{START_MARKER}' et '{END_MARKER}' sont bien dans votre README.md")

if __name__ == "__main__":
    update_readme()