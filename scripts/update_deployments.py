import requests
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

    html = "<table>\n"
    cols = 3
    rows = math.ceil(len(repos) / cols)

    for r in range(rows):
        html += "  <tr>\n"
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
                
                html += f'    <td align="center"><a href="{site_url}"><code>{repo["name"]}</code></a></td>\n'
            else:
                html += '    <td align="center">✨</td>\n' # Cellule vide jolie
        html += "  </tr>\n"
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
        new_content = pre + START_MARKER + "\n" + new_table + "\n" + END_MARKER + post
        
        with open(README_PATH, "w", encoding="utf-8") as f:
            f.write(new_content)
        print("README updated successfully.")
    else:
        print("Markers not found in README. Please run the setup script first.")

if __name__ == "__main__":
    update_readme()
