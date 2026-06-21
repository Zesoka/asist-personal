from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import database
import datetime
from typing import List, Optional
from routers.auth import get_current_user

router = APIRouter(prefix="/calendar", tags=["calendar"])

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
def list_family_events(current_user: dict = Depends(get_current_user)):
    """Retrieve all family events for the current day, showing who scheduled what."""
    now = datetime.datetime.now()
    start_of_day = datetime.datetime(now.year, now.month, now.day, 0, 0, 0).isoformat()
    end_of_day = datetime.datetime(now.year, now.month, now.day, 23, 59, 59).isoformat()
    
    with database.get_db_connection() as conn:
        rows = conn.execute("""
            SELECT family_events.*, users.username 
            FROM family_events 
            JOIN users ON family_events.user_id = users.id 
            WHERE (start_time BETWEEN ? AND ?) OR (end_time BETWEEN ? AND ?)
            ORDER BY start_time ASC
        """, (start_of_day, end_of_day, start_of_day, end_of_day)).fetchall()
        
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

@router.get("/google-events")
def get_google_events(current_user: dict = Depends(get_current_user)):
    """Google Calendar endpoint placeholder (acts as mock mode or links token)."""
    # Simply return mock calendar events representing the integration
    # Since OAuth can be complex inside docker, we offer this mock baseline
    now = datetime.datetime.now()
    return [
        {
            "summary": "🌅 Reunión de Sincronización Familiar (Mock)",
            "start": datetime.datetime(now.year, now.month, now.day, 9, 0).isoformat(),
            "end": datetime.datetime(now.year, now.month, now.day, 9, 30).isoformat(),
            "description": "Revisión rápida del día por videollamada.",
            "location": "Google Meet"
        },
        {
            "summary": "🩺 Turno Médico - Pediatra (Mock)",
            "start": datetime.datetime(now.year, now.month, now.day, 11, 30).isoformat(),
            "end": datetime.datetime(now.year, now.month, now.day, 12, 30).isoformat(),
            "description": "Control anual de vacunas y estatura.",
            "location": "Clínica del Valle"
        }
    ]
