from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional
import database
import config
import uuid
import shutil
from pathlib import Path
from routers.auth import get_current_user, get_current_admin

router = APIRouter(prefix="/shortcuts", tags=["shortcuts"])

@router.get("")
def list_shortcuts(current_user: dict = Depends(get_current_user)):
    """Retrieve all shortcuts ordered by clicks."""
    with database.get_db_connection() as conn:
        rows = conn.execute("SELECT * FROM shortcuts ORDER BY clicks DESC, name ASC").fetchall()
    return [dict(r) for r in rows]

@router.post("")
async def add_shortcut(
    name: str = Form(...),
    url: str = Form(...),
    icon_type: str = Form(...),  # "emoji" or "upload"
    emoji: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_admin: dict = Depends(get_current_admin)
):
    """Add a new shortcut. Emojis or image files can be used as icons (Admin-only)."""
    icon_path = "🔗"
    
    if icon_type == "emoji" and emoji:
        icon_path = emoji
    elif icon_type == "upload" and file:
        # Save custom uploaded icon
        file_ext = file.filename.split(".")[-1] if "." in file.filename else "png"
        filename = f"{uuid.uuid4().hex}.{file_ext}"
        save_path = Path(config.ICONS_DIR) / filename
        
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # We store the relative URL path to be accessible by the frontend
        icon_path = f"/media/icons/{filename}"
    else:
        if emoji:
            icon_path = emoji

    # Format URL safely
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    with database.get_db_connection() as conn:
        conn.execute(
            "INSERT INTO shortcuts (name, url, icon_path) VALUES (?, ?, ?)",
            (name, url, icon_path)
        )
        conn.commit()
        
    return {"message": f"Acceso directo a {name} creado con éxito"}

@router.post("/{shortcut_id}/click")
def register_click(shortcut_id: int, current_user: dict = Depends(get_current_user)):
    """Increment the click counter for a shortcut."""
    with database.get_db_connection() as conn:
        # Verify shortcut exists
        shortcut = conn.execute("SELECT id FROM shortcuts WHERE id = ?", (shortcut_id,)).fetchone()
        if not shortcut:
            raise HTTPException(status_code=404, detail="Acceso directo no encontrado")
            
        conn.execute("UPDATE shortcuts SET clicks = clicks + 1 WHERE id = ?", (shortcut_id,))
        conn.commit()
    return {"message": "Click registrado con éxito"}

@router.delete("/{shortcut_id}")
def delete_shortcut(shortcut_id: int, current_admin: dict = Depends(get_current_admin)):
    """Delete a shortcut (Admin-only)."""
    with database.get_db_connection() as conn:
        shortcut = conn.execute("SELECT icon_path FROM shortcuts WHERE id = ?", (shortcut_id,)).fetchone()
        if not shortcut:
            raise HTTPException(status_code=404, detail="Acceso directo no encontrado")
            
        # Delete custom icon file if it exists
        if shortcut["icon_path"].startswith("/media/icons/"):
            filename = shortcut["icon_path"].split("/")[-1]
            file_path = Path(config.ICONS_DIR) / filename
            if file_path.exists():
                file_path.unlink()
                
        conn.execute("DELETE FROM shortcuts WHERE id = ?", (shortcut_id,))
        conn.commit()
        
    return {"message": "Acceso directo eliminado"}
