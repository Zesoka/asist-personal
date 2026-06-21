from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from pydantic import BaseModel
import database
import datetime
from typing import List, Optional
from routers.auth import get_current_user
from pathlib import Path
import config

router = APIRouter(prefix="/calendar", tags=["calendar"])

DB_DIR = Path(config.DB_PATH).parent
CREDENTIALS_FILE = DB_DIR / "credentials.json"

def get_token_file(user_id: int) -> Path:
    return DB_DIR / f"token_user_{user_id}.json"

def get_redirect_uri(request: Request) -> str:
    proto = request.headers.get("x-forwarded-proto", "http")
    host = request.headers.get("x-forwarded-host") or request.headers.get("host", "localhost:8501")
    return f"{proto}://{host}/api/calendar/oauth2callback"


class FamilyEventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: str  # ISO string
    end_time: str    # ISO string
    location: Optional[str] = None

class FamilyEventResponse(BaseModel):
    id: int
    user_id: int
    username: str
    title: str
    description: Optional[str]
    start_time: str
    end_time: str
    location: Optional[str]

# --- Shared Family Calendar (SQLite) ---

@router.get("/events")
def list_family_events(start_date: Optional[str] = None, end_date: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Retrieve all family events within a date range, showing who scheduled what."""
    now = datetime.datetime.now()
    if not start_date:
        start_date = datetime.datetime(now.year, now.month, now.day, 0, 0, 0).isoformat()
    if not end_date:
        end_date = datetime.datetime(now.year, now.month, now.day, 23, 59, 59).isoformat()
        
    with database.get_db_connection() as conn:
        rows = conn.execute("""
            SELECT family_events.*, users.username 
            FROM family_events 
            JOIN users ON family_events.user_id = users.id 
            WHERE (start_time BETWEEN ? AND ?) OR (end_time BETWEEN ? AND ?) OR (start_time <= ? AND end_time >= ?)
            ORDER BY start_time ASC
        """, (start_date, end_date, start_date, end_date, start_date, end_date)).fetchall()
        
    events = []
    for r in rows:
        events.append({
            "id": r["id"],
            "user_id": r["user_id"],
            "username": r["username"],
            "title": r["title"],
            "description": r["description"],
            "start_time": r["start_time"],
            "end_time": r["end_time"],
            "location": r["location"]
        })
    return events

@router.post("/events")
def create_family_event(event: FamilyEventCreate, current_user: dict = Depends(get_current_user)):
    """Add a new scheduled event on the shared family calendar."""
    # Validate start/end dates
    try:
        start_dt = datetime.datetime.fromisoformat(event.start_time)
        end_dt = datetime.datetime.fromisoformat(event.end_time)
        if start_dt > end_dt:
            raise HTTPException(status_code=400, detail="La hora de inicio debe ser anterior a la de fin")
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido. Utiliza formato ISO 8601.")
        
    with database.get_db_connection() as conn:
        conn.execute("""
            INSERT INTO family_events (user_id, title, description, start_time, end_time, location) 
            VALUES (?, ?, ?, ?, ?, ?)
        """, (current_user["id"], event.title, event.description, event.start_time, event.end_time, event.location))
        conn.commit()
        
    return {"message": "Evento familiar guardado con éxito"}

@router.delete("/events/{event_id}")
def delete_family_event(event_id: int, current_user: dict = Depends(get_current_user)):
    """Remove a family event (Users can delete their own; admins can delete any)."""
    with database.get_db_connection() as conn:
        event = conn.execute("SELECT user_id FROM family_events WHERE id = ?", (event_id,)).fetchone()
        if not event:
            raise HTTPException(status_code=404, detail="Evento no encontrado")
            
        if current_user["role"] != "admin" and event["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="No puedes eliminar eventos de otros miembros")
            
        conn.execute("DELETE FROM family_events WHERE id = ?", (event_id,))
        conn.commit()
        
    return {"message": "Evento eliminado"}

# --- Google Calendar API (Timeline View) ---

@router.post("/upload-credentials")
def upload_credentials(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload Google OAuth2 client credentials JSON file (Admin only)."""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo los administradores pueden subir credenciales")
        
    DB_DIR.mkdir(parents=True, exist_ok=True)
    
    try:
        content = file.file.read()
        import json
        json.loads(content)
        
        with open(CREDENTIALS_FILE, 'wb') as f:
            f.write(content)
            
        for token_path in DB_DIR.glob("token_user_*.json"):
            token_path.unlink()
            
        return {"message": "Credenciales subidas con éxito"}
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="El archivo no es un JSON válido")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar las credenciales: {str(e)}")

@router.get("/auth-url")
def get_auth_url(request: Request, current_user: dict = Depends(get_current_user)):
    """Generate Google OAuth2 authorization URL."""
    if not CREDENTIALS_FILE.exists():
        raise HTTPException(status_code=400, detail="Falta el archivo credentials.json. Por favor, súbelo como administrador.")
        
    from google_auth_oauthlib.flow import Flow
    
    try:
        flow = Flow.from_client_secrets_file(
            str(CREDENTIALS_FILE),
            scopes=['https://www.googleapis.com/auth/calendar.readonly'],
            redirect_uri=get_redirect_uri(request),
            autogenerate_code_verifier=False
        )
        auth_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent',
            state=str(current_user["id"])
        )
        return {"auth_url": auth_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar la URL de autorización: {str(e)}")

@router.get("/oauth2callback")
def oauth2callback(code: str, state: Optional[str] = None, request: Request = None):
    """Google OAuth2 redirect callback handler."""
    if not CREDENTIALS_FILE.exists():
        raise HTTPException(status_code=400, detail="Falta el archivo credentials.json")
        
    from google_auth_oauthlib.flow import Flow
    
    try:
        try:
            user_id = int(state) if state else None
        except ValueError:
            user_id = None
            
        if not user_id:
            raise ValueError("Estado de usuario inválido en la redirección")
            
        flow = Flow.from_client_secrets_file(
            str(CREDENTIALS_FILE),
            scopes=['https://www.googleapis.com/auth/calendar.readonly'],
            redirect_uri=get_redirect_uri(request),
            autogenerate_code_verifier=False
        )
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        DB_DIR.mkdir(parents=True, exist_ok=True)
        token_file = get_token_file(user_id)
        with open(token_file, 'w') as f:
            f.write(credentials.to_json())
            
        proto = request.headers.get("x-forwarded-proto", "http")
        host = request.headers.get("x-forwarded-host") or request.headers.get("host", "localhost:8501")
        
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=f"{proto}://{host}/calendar?status=success")
    except Exception as e:
        proto = request.headers.get("x-forwarded-proto", "http")
        host = request.headers.get("x-forwarded-host") or request.headers.get("host", "localhost:8501")
        from fastapi.responses import RedirectResponse
        import urllib.parse
        err_msg = urllib.parse.quote(str(e))
        return RedirectResponse(url=f"{proto}://{host}/calendar?status=error&message={err_msg}")

@router.get("/google-events")
def get_google_events(start_date: Optional[str] = None, end_date: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Retrieve real synced events from Google Calendar in the specified date range."""
    if not CREDENTIALS_FILE.exists():
        return {"status": "no_credentials", "message": "Falta el archivo credentials.json. Por favor, súbelo como administrador."}
        
    token_file = get_token_file(current_user["id"])
    if not token_file.exists():
        return {"status": "auth_required", "message": "Google Calendar no está conectado."}
        
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request as GoogleRequest
        from googleapiclient.discovery import build
        
        creds = Credentials.from_authorized_user_file(str(token_file), ['https://www.googleapis.com/auth/calendar.readonly'])
        
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(GoogleRequest())
            with open(token_file, 'w') as f:
                f.write(creds.to_json())
                
        if not creds or not creds.valid:
            return {"status": "auth_required", "message": "La conexión con Google Calendar expiró."}
            
        service = build('calendar', 'v3', credentials=creds)
        
        now = datetime.datetime.now()
        if not start_date:
            start_date = datetime.datetime(now.year, now.month, now.day, 0, 0, 0).isoformat()
        if not end_date:
            end_date = datetime.datetime(now.year, now.month, now.day, 23, 59, 59).isoformat()
            
        if not start_date.endswith('Z'):
            if '+' not in start_date and '-' not in start_date[-6:]:
                start_date = start_date + 'Z'
        if not end_date.endswith('Z'):
            if '+' not in end_date and '-' not in end_date[-6:]:
                end_date = end_date + 'Z'
                
        events_result = service.events().list(
            calendarId='primary',
            timeMin=start_date,
            timeMax=end_date,
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        
        events = events_result.get('items', [])
        
        formatted_events = []
        for event in events:
            start = event['start'].get('dateTime', event['start'].get('date'))
            end = event['end'].get('dateTime', event['end'].get('date'))
            formatted_events.append({
                "summary": event.get('summary', '(Sin título)'),
                "start": start,
                "end": end,
                "description": event.get('description', ''),
                "location": event.get('location', '')
            })
            
        return {"status": "connected", "events": formatted_events}
        
    except Exception as e:
        print(f"Error fetching Google Calendar: {e}")
        return {"status": "auth_required", "message": f"Error de autenticación con Google Calendar: {str(e)}"}
