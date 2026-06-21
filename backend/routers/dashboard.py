from fastapi import APIRouter, HTTPException
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/news")
def get_dashboard_news():
    """Fetches Google News RSS for Argentina, parses it, and returns the top 5 news articles."""
    url = "https://news.google.com/rss?hl=es-419&gl=AR&ceid=AR:es-419"
    
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            xml_data = response.read()
            
        root = ET.fromstring(xml_data)
        articles = []
        
        # Extract items from rss channel
        items = root.findall(".//item")
        for item in items[:6]:  # fetch top 6 articles
            title_text = item.find("title").text if item.find("title") is not None else "Sin título"
            link = item.find("link").text if item.find("link") is not None else "#"
            pub_date_raw = item.find("pubDate").text if item.find("pubDate") is not None else ""
            source = item.find("source").text if item.find("source") is not None else ""
            
            # Format the title (Google News titles usually end with "- Source Name")
            clean_title = title_text
            extracted_source = source
            if " - " in title_text:
                parts = title_text.rsplit(" - ", 1)
                clean_title = parts[0]
                if not extracted_source:
                    extracted_source = parts[1]
            
            # Format date
            formatted_date = ""
            if pub_date_raw:
                try:
                    # Example: Wed, 20 Jun 2026 20:00:00 GMT
                    dt = datetime.strptime(pub_date_raw[:25].strip(), "%a, %d %b %Y %H:%M:%S")
                    formatted_date = dt.strftime("%d/%m %H:%M")
                except Exception:
                    formatted_date = pub_date_raw
            
            articles.append({
                "title": clean_title,
                "link": link,
                "pub_date": formatted_date,
                "source": extracted_source or "Noticias"
            })
            
        return articles
        
    except Exception as e:
        print(f"Error fetching news: {e}")
        # Fallback news if feed fails
        return [
            {"title": "No se pudieron cargar las noticias de último momento.", "link": "#", "pub_date": "", "source": "Sistema"},
            {"title": "Mundial 2026: Continúan los preparativos para la gran cita del fútbol.", "link": "https://www.fifa.com/", "pub_date": "Hoy", "source": "Deportes"},
            {"title": "Búsqueda activa: Continúan los planes de organización y productividad familiar.", "link": "#", "pub_date": "Hoy", "source": "Personal"}
        ]
