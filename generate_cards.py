import requests
import os
import base64
import re
import sys
from urllib.parse import quote

# --- Configuration ---
USERNAME = "infinition"
README_PATH = "README.md"
CARDS_OUTPUT_DIR = "cards"

# URLs des icônes SVG encodées en base64
ICON_VSCODE = """<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z"/></svg>"""

ICON_OBSIDIAN = """<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18L19.82 8 12 11.82 4.18 8 12 4.18zM4 9.72l7 3.5v7.78l-7-3.5V9.72zm16 0v7.78l-7 3.5v-7.78l7-3.5z"/></svg>"""

ICON_GITHUB = """<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path></svg>"""

ICON_STAR = """<svg class="stat-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"></path></svg>"""

ICON_FORK = """<svg class="stat-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z"></path></svg>"""

# Couleurs par langage
LANG_COLORS = {
    'TypeScript': '#3178c6',
    'JavaScript': '#f1e05a',
    'Python': '#3572A5',
    'HTML': '#e34c26',
    'CSS': '#563d7c',
    'Java': '#b07219',
    'C++': '#f34b7d',
    'C': '#555555',
    'Rust': '#dea584',
}

# Couleurs par catégorie
CATEGORY_COLORS = {
    'vscode': '#0078d7',
    'obsidian': '#8250df',
    'live': '#4a90e2',
    'other': '#58a6ff'
}

def get_repos():
    print(f"--- Récupération des repos pour {USERNAME} ---")
    url = f"https://api.github.com/users/{USERNAME}/repos?per_page=100"
    headers = {}
    token = os.getenv("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"token {token}"
        print("✅ Token GitHub détecté.")
    
    repos = []
    page = 1
    while page <= 20:
        try:
            r = requests.get(f"{url}&page={page}", headers=headers, timeout=20)
            if r.status_code != 200:
                break
            data = r.json()
            if not data:
                break
            repos.extend(data)
            page += 1
        except Exception as e:
            print(f"❌ Erreur : {e}")
            break
    
    print(f"✅ {len(repos)} repos récupérés")
    return repos

def get_repo_icon_url(repo_name):
    """Récupère l'URL de la première image du README"""
    url = f"https://api.github.com/repos/{USERNAME}/{repo_name}/readme"
    headers = {"Accept": "application/vnd.github.v3.raw"}
    token = os.getenv("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"token {token}"
    
    try:
        r = requests.get(url, headers=headers, timeout=10)
        if r.status_code == 200:
            readme = r.text
            # Format markdown
            md_match = re.search(r'!\[.*?\]\((https?://[^\)]+)\)', readme)
            if md_match:
                return md_match.group(1)
            # Format HTML
            html_match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', readme)
            if html_match:
                img_url = html_match.group(1)
                if not img_url.startswith('http'):
                    img_url = f"https://raw.githubusercontent.com/{USERNAME}/{repo_name}/main/{img_url}"
                return img_url
    except:
        pass
    
    # Fallback: icône par défaut
    return f"https://via.placeholder.com/65/888888/ffffff?text={repo_name[0].upper()}"

def check_vscode_release(repo_name):
    """Vérifie si c'est une extension VSCode"""
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

def escape_xml(text):
    """Échappe les caractères spéciaux XML"""
    if not text:
        return ""
    return (text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace('"', "&quot;")
                .replace("'", "&apos;"))

def truncate_text(text, max_length):
    """Tronque le texte intelligemment"""
    if not text or len(text) <= max_length:
        return text
    return text[:max_length-3] + "..."

def generate_card_svg(repo, category):
    """Génère une card SVG pour un repo"""
    name = repo["name"]
    description = escape_xml(repo.get("description") or "No description provided")
    description = truncate_text(description, 120)
    
    stars = repo.get("stargazers_count", 0)
    forks = repo.get("forks_count", 0)
    language = repo.get("language") or "Unknown"
    lang_color = LANG_COLORS.get(language, "#888888")
    border_color = CATEGORY_COLORS.get(category, "#58a6ff")
    
    # Récupérer l'icône
    icon_url = get_repo_icon_url(name)
    
    # Badge catégorie
    if category == "vscode":
        badge_text = "VSCode"
        badge_icon = ICON_VSCODE
        badge_bg = "rgba(0, 120, 215, 0.15)"
        badge_color = "#0078d7"
        badge_border = "rgba(0, 120, 215, 0.3)"
    elif category == "obsidian":
        badge_text = "Obsidian"
        badge_icon = ICON_OBSIDIAN
        badge_bg = "rgba(130, 80, 223, 0.15)"
        badge_color = "#8250df"
        badge_border = "rgba(130, 80, 223, 0.3)"
    elif category == "live":
        badge_text = "Live"
        badge_icon = ICON_GITHUB
        badge_bg = "rgba(74, 144, 226, 0.15)"
        badge_color = "#4a90e2"
        badge_border = "rgba(74, 144, 226, 0.3)"
    else:
        badge_text = "Repository"
        badge_icon = ICON_GITHUB
        badge_bg = "rgba(136, 136, 136, 0.15)"
        badge_color = "#888888"
        badge_border = "rgba(136, 136, 136, 0.3)"
    
    svg = f"""<svg width="380" height="180" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#161b22;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#0d1117;stop-opacity:1" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:rgba(88, 166, 255, 0.03);stop-opacity:1" />
            <stop offset="70%" style="stop-color:transparent;stop-opacity:0" />
        </radialGradient>
    </defs>
    
    <!-- Background -->
    <rect width="380" height="180" rx="10" fill="url(#bg-gradient)"/>
    <rect width="380" height="180" rx="10" fill="url(#glow)"/>
    
    <!-- Border -->
    <rect width="380" height="180" rx="10" fill="none" stroke="#30363d" stroke-width="1"/>
    <rect x="0" y="0" width="4" height="180" rx="10" fill="{border_color}"/>
    
    <!-- Badge catégorie -->
    <g transform="translate(270, 15)">
        <rect width="95" height="24" rx="12" fill="{badge_bg}" stroke="{badge_border}" stroke-width="1"/>
        <g transform="translate(8, 5)" fill="{badge_color}">
            {badge_icon}
        </g>
        <text x="30" y="16" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="600" fill="{badge_color}" text-transform="uppercase">{badge_text}</text>
    </g>
    
    <!-- Icône du repo -->
    <image x="20" y="20" width="65" height="65" href="{icon_url}" preserveAspectRatio="xMidYMid meet"/>
    <rect x="20" y="20" width="65" height="65" rx="10" fill="none" stroke="#30363d" stroke-width="2"/>
    
    <!-- Titre -->
    <text x="95" y="50" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="700" fill="#e6edf3">{escape_xml(name[:30])}</text>
    
    <!-- Description -->
    <foreignObject x="20" y="95" width="340" height="45">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: system-ui, -apple-system, sans-serif; font-size: 13px; color: #8b949e; line-height: 1.5; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
            {description}
        </div>
    </foreignObject>
    
    <!-- Stats -->
    <g transform="translate(20, 155)">
        <!-- Stars -->
        <g fill="#6e7681">
            {ICON_STAR.replace('class="stat-icon"', 'width="14" height="14"')}
        </g>
        <text x="20" y="11" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#6e7681">{stars}</text>
        
        <!-- Forks -->
        <g transform="translate(60, 0)" fill="#6e7681">
            {ICON_FORK.replace('class="stat-icon"', 'width="14" height="14"')}
        </g>
        <text x="80" y="11" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#6e7681">{forks}</text>
        
        <!-- Language -->
        <circle cx="125" cy="7" r="5" fill="{lang_color}"/>
        <text x="135" y="11" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#6e7681">{escape_xml(language)}</text>
    </g>
</svg>"""
    
    return svg

def filter_repos(repos):
    """Filtre et catégorise les repos"""
    own_repos = [r for r in repos if not r.get("fork")]
    
    vscode_repos = []
    obsidian_repos = []
    live_repos = []
    other_repos = []
    
    for repo in own_repos:
        name = repo["name"]
        if check_vscode_release(name):
            vscode_repos.append(repo)
        elif name.lower().startswith("obsidian-"):
            obsidian_repos.append(repo)
        elif repo.get("has_pages"):
            live_repos.append(repo)
        elif name != USERNAME:
            other_repos.append(repo)
    
    # Tris
    vscode_repos.sort(key=lambda x: x["name"].lower())
    obsidian_repos.sort(key=lambda x: x["name"].lower())
    live_repos.sort(key=lambda x: x["name"].lower())
    other_repos.sort(key=lambda x: x["name"].lower())
    
    return live_repos, vscode_repos, obsidian_repos, other_repos

def generate_cards():
    """Génère toutes les cards"""
    repos = get_repos()
    if not repos:
        print("❌ Aucun repo")
        sys.exit(1)
    
    live, vscode, obsidian, other = filter_repos(repos)
    
    # Créer le dossier de sortie
    os.makedirs(CARDS_OUTPUT_DIR, exist_ok=True)
    
    categories = [
        ("live", live),
        ("vscode", vscode),
        ("obsidian", obsidian),
        ("other", other)
    ]
    
    all_cards = {}
    
    for cat_name, repos_list in categories:
        for repo in repos_list:
            card_svg = generate_card_svg(repo, cat_name)
            filename = f"{repo['name']}.svg"
            filepath = os.path.join(CARDS_OUTPUT_DIR, filename)
            
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(card_svg)
            
            print(f"✅ Généré : {filename}")
            
            # Stocker pour le README
            if cat_name not in all_cards:
                all_cards[cat_name] = []
            all_cards[cat_name].append({
                'name': repo['name'],
                'file': filename,
                'url': repo.get('homepage') or repo['html_url']
            })
    
    return all_cards

def update_readme_with_cards(all_cards):
    """Met à jour le README avec les cards"""
    try:
        with open(README_PATH, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        print(f"❌ Erreur lecture README: {e}")
        return
    
    sections = [
        ("live", "<!-- AUTO_LIVE_START -->", "<!-- AUTO_LIVE_END -->"),
        ("vscode", "<!-- AUTO_VSCODE_START -->", "<!-- AUTO_VSCODE_END -->"),
        ("obsidian", "<!-- AUTO_OBSIDIAN_START -->", "<!-- AUTO_OBSIDIAN_END -->"),
        ("other", "<!-- AUTO_OTHER_START -->", "<!-- AUTO_OTHER_END -->")
    ]
    
    for cat_name, start_tag, end_tag in sections:
        if cat_name not in all_cards:
            continue
        
        cards = all_cards[cat_name]
        
        # Générer le markdown (2 cards par ligne)
        md_lines = []
        for i in range(0, len(cards), 2):
            line_cards = cards[i:i+2]
            line = " ".join([
                f'<a href="{card["url"]}"><img src="cards/{card["file"]}" alt="{card["name"]}" width="380"/></a>'
                for card in line_cards
            ])
            md_lines.append(line)
        
        new_content = "\n".join(md_lines)
        
        # Remplacer dans le README
        pattern = f"({re.escape(start_tag)})[\\s\\S]*?({re.escape(end_tag)})"
        if re.search(pattern, content):
            content = re.sub(pattern, f"\\1\n{new_content}\n\\2", content)
            print(f"✅ Section {cat_name} mise à jour")
    
    with open(README_PATH, "w", encoding="utf-8") as f:
        f.write(content)
    
    print("🎉 README mis à jour !")

if __name__ == "__main__":
    all_cards = generate_cards()
    update_readme_with_cards(all_cards)