import os
import requests

# CONFIGURATION
USERNAME = "infinition"
TOKEN = os.environ["GH_TOKEN"] 
THEME_BG = "#0D1117"            # Fond sombre GitHub
COLOR_LOW = "#391800"           # Orange très sombre (inactif)
COLOR_HIGH = "#FF6B00"          # Ton Orange Hacker (actif)
COLOR_PEAK = "#FF2200"          # Rouge (pic d'activité)

def fetch_data():
    headers = {"Authorization": f"Bearer {TOKEN}"}
    query = """
    query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
    """
    request = requests.post('https://api.github.com/graphql', json={'query': query, 'variables': {'login': USERNAME}}, headers=headers)
    if request.status_code == 200:
        return request.json()
    else:
        raise Exception(f"Query failed: {request.status_code}")

def generate_svg(data):
    weeks = data['data']['user']['contributionsCollection']['contributionCalendar']['weeks']
    
    # Dimensions
    width = 850
    height = 180
    cell_size = 14
    margin = 4
    
    svg_content = f'<svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg" style="background-color: {THEME_BG}; border-radius: 10px;">'
    svg_content += f'<style>.glow {{ filter: drop-shadow(0px 0px 4px {COLOR_HIGH}); }}</style>'
    
    x = 20
    for week in weeks:
        y = 20
        for day in week['contributionDays']:
            count = day['contributionCount']
            
            # Logique du style "Bulles / Pics"
            if count == 0:
                radius = 2
                color = "#1F242C" # Gris sombre presque invisible
                opacity = 0.3
                css_class = ""
            elif count <= 3:
                radius = 4
                color = COLOR_LOW
                opacity = 0.6
                css_class = ""
            elif count <= 8:
                radius = 6
                color = COLOR_HIGH
                opacity = 0.8
                css_class = "glow"
            else:
                # GROS PIC D'ACTIVITÉ (Style "Blob")
                radius = 7.5
                color = COLOR_PEAK
                opacity = 1.0
                css_class = "glow"

            # On dessine le cercle
            svg_content += f'<circle cx="{x}" cy="{y}" r="{radius}" fill="{color}" opacity="{opacity}" class="{css_class}" />'
            y += cell_size + margin
        x += cell_size + margin
        
    svg_content += '</svg>'
    return svg_content

if __name__ == "__main__":
    try:
        data = fetch_data()
        svg = generate_svg(data)
        with open("assets/cyber_activity.svg", "w") as f:
            f.write(svg)
        print("Graphique Cyber généré avec succès.")
    except Exception as e:
        print(f"Erreur: {e}")