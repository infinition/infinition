import os

# ==========================================
# 1. CONTENU DU SCRIPT DE MISE A JOUR (Python)
# ==========================================
update_script_content = """import requests
import os
import math

USERNAME = "infinition"
README_PATH = "README.md"
START_MARKER = ""
END_MARKER = ""

def get_repos():
    url = f"https://api.github.com/users/{USERNAME}/repos?per_page=100"
    headers = {}
    token = os.getenv("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"token {token}"
    
    repos = []
    page = 1
    while True:
        r = requests.get(f"{url}&page={page}", headers=headers)
        if r.status_code != 200:
            break
        data = r.json()
        if not data:
            break
        repos.extend(data)
        page += 1
    return repos

def filter_and_sort_repos(repos):
    # Garder uniquement ceux avec GitHub Pages activé
    pages_repos = [r for r in repos if r.get("has_pages")]

    # Définir l'ordre de priorité
    priority = ["infinition", "Bjorn"]
    
    top_repos = []
    other_repos = []

    for repo in pages_repos:
        if repo["name"] in priority:
            top_repos.append(repo)
        else:
            other_repos.append(repo)

    # Trier les prioritaires selon l'ordre défini
    top_repos.sort(key=lambda x: priority.index(x["name"]))
    
    # Trier les autres par date de mise à jour (plus récent en premier) ou alphabétique
    other_repos.sort(key=lambda x: x["updated_at"], reverse=True)

    return top_repos + other_repos

def generate_html_table(repos):
    if not repos:
        return "No deployments found."

    html = "<table>\\n"
    cols = 3
    rows = math.ceil(len(repos) / cols)

    for r in range(rows):
        html += "  <tr>\\n"
        for c in range(cols):
            idx = r * cols + c
            if idx < len(repos):
                repo = repos[idx]
                # L'URL du site est généralement username.github.io/repo_name/
                # Sauf pour le repo 'username.github.io' qui est à la racine
                if repo["name"].lower() == f"{USERNAME}.github.io".lower():
                    site_url = f"https://{USERNAME}.github.io/"
                else:
                    site_url = f"https://{USERNAME}.github.io/{repo['name']}/"
                
                html += f'    <td align="center"><a href="{site_url}"><code>{repo["name"]}</code></a></td>\\n'
            else:
                html += '    <td align="center">✨</td>\\n' # Cellule vide jolie
        html += "  </tr>\\n"
    html += "</table>"
    return html

def update_readme():
    repos = get_repos()
    sorted_repos = filter_and_sort_repos(repos)
    new_table = generate_html_table(sorted_repos)

    try:
        with open(README_PATH, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        print("README.md not found!")
        return

    if START_MARKER in content and END_MARKER in content:
        pre = content.split(START_MARKER)[0]
        post = content.split(END_MARKER)[1]
        new_content = pre + START_MARKER + "\\n" + new_table + "\\n" + END_MARKER + post
        
        with open(README_PATH, "w", encoding="utf-8") as f:
            f.write(new_content)
        print("README updated successfully.")
    else:
        print("Markers not found in README. Please run the setup script first.")

if __name__ == "__main__":
    update_readme()
"""

# ==========================================
# 2. CONTENU DU WORKFLOW GITHUB ACTIONS (YAML)
# ==========================================
workflow_content = """name: Update Deployments List

on:
  schedule:
    - cron: '0 0 * * *' # Tous les jours à minuit
  workflow_dispatch: # Permet de lancer manuellement depuis l'onglet Actions
  push:
    branches:
      - main
      - master

jobs:
  update-readme:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.x'
          
      - name: Install dependencies
        run: pip install requests
        
      - name: Run update script
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: python scripts/update_deployments.py
        
      - name: Commit and push if changed
        run: |
          git config --global user.name 'GitHub Action'
          git config --global user.email 'action@github.com'
          git diff --quiet || (git add README.md && git commit -m "🤖 Auto-update deployment list" && git push)
"""

# ==========================================
# 3. FONCTIONS D'INSTALLATION
# ==========================================

def create_files():
    # 1. Créer le dossier scripts et le fichier python
    if not os.path.exists("scripts"):
        os.makedirs("scripts")
    
    with open("scripts/update_deployments.py", "w", encoding="utf-8") as f:
        f.write(update_script_content)
    print("✅ Created scripts/update_deployments.py")

    # 2. Créer le dossier workflows et le fichier yaml
    if not os.path.exists(".github/workflows"):
        os.makedirs(".github/workflows")
        
    with open(".github/workflows/update-readme.yml", "w", encoding="utf-8") as f:
        f.write(workflow_content)
    print("✅ Created .github/workflows/update-readme.yml")

def patch_readme():
    readme_path = "README.md"
    start_tag = ""
    end_tag = ""
    
    if not os.path.exists(readme_path):
        print("❌ README.md not found. Please create it first.")
        return

    with open(readme_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Si les balises existent déjà, on ne fait rien
    if start_tag in content:
        print("ℹ️ Markers already present in README.")
        return

    # Logique pour insérer les balises autour de la table existante
    # On cherche le titre "### 🌐 Live Deployments"
    target_header = "### 🌐 Live Deployments"
    
    if target_header in content:
        # On remplace la section statique par les balises
        # On cherche le début de la table après le header
        parts = content.split(target_header)
        pre_header = parts[0]
        post_header = parts[1]
        
        # On suppose que la table commence par <table> et finit par </table>
        if "<table>" in post_header and "</table>" in post_header:
            before_table = post_header.split("<table>")[0]
            after_table = post_header.split("</table>")[1]
            
            new_section = (
                f"{target_header}\n"
                f"{before_table}"
                f"{start_tag}\n"
                "<table>\n"
                "  \n"
                "</table>\n"
                f"{end_tag}"
                f"{after_table}"
            )
            
            new_content = pre_header + new_section
            
            with open(readme_path, "w", encoding="utf-8") as f:
                f.write(new_content)
            print("✅ README.md patched with automation markers.")
            
            # Optionnel : lancer le script de mise à jour immédiatement pour remplir la table
            print("🔄 Running initial update...")
            os.system("python3 scripts/update_deployments.py")
        else:
            print("⚠️ Table not found in README. Adding markers at the end of the file.")
            with open(readme_path, "a", encoding="utf-8") as f:
                f.write(f"\n\n{target_header}\n{start_tag}\n{end_tag}\n")
    else:
        print("⚠️ Header '### 🌐 Live Deployments' not found. Please add the section manually or check your README.")

if __name__ == "__main__":
    create_files()
    patch_readme()
    print("\n🚀 Setup complete! Now commit and push:")
    print("git add .")
    print('git commit -m "Setup auto-update for deployments"')
    print("git push")