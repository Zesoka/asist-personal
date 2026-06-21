from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional
import database
import config
import uuid
import shutil
from pathlib import Path
from routers.auth import get_current_user

router = APIRouter(prefix="/notes", tags=["notes"])

@router.get("/")
def list_notes(current_user: dict = Depends(get_current_user)):
    """Retrieve all notes, newest first. Includes author usernames."""
    with database.get_db_connection() as conn:
        rows = conn.execute("""
            SELECT notes.*, users.username as author 
            FROM notes 
            JOIN users ON notes.user_id = users.id 
            ORDER BY notes.created_at DESC
        """).fetchall()
    return [dict(r) for r in rows]

@router.post("/")
async def add_note(
    title: str = Form(...),
    content: str = Form(...),
    file: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    """Create a new multimedia note. Camera captures are sent as files."""
    image_path = None
    
    if file:
        file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        filename = f"{uuid.uuid4().hex}.{file_ext}"
        save_path = Path(config.NOTES_DIR) / filename
        
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        image_path = f"/media/notes/{filename}"

    with database.get_db_connection() as conn:
        conn.execute(
            "INSERT INTO notes (title, content, image_path, user_id) VALUES (?, ?, ?, ?)",
            (title, content, image_path, current_user["id"])
        )
        conn.commit()
        
    return {"message": "Nota guardada con éxito"}

@router.delete("/{note_id}")
def delete_note(note_id: int, current_user: dict = Depends(get_current_user)):
    """Delete a note (Users can delete their own; admins can delete any)."""
    with database.get_db_connection() as conn:
        note = conn.execute("SELECT user_id, image_path FROM notes WHERE id = ?", (note_id,)).fetchone()
        if not note:
            raise HTTPException(status_code=404, detail="Nota no encontrada")
            
        # Permission check
        if current_user["role"] != "admin" and note["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="No tienes permisos para eliminar esta nota")
            
        # Delete image file from filesystem if exists
        if note["image_path"]:
            filename = note["image_path"].split("/")[-1]
            file_path = Path(config.NOTES_DIR) / filename
            if file_path.exists():
                file_path.unlink()
                
        conn.execute("DELETE FROM notes WHERE id = ?", (note_id,))
        conn.commit()
        
    return {"message": "Nota eliminada"}
