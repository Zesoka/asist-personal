from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import Optional
import shutil
import uuid
from pathlib import Path
import database
import security
import config

router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str = "user"  # "admin" or "user"
    full_name: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

class UserProfile(BaseModel):
    id: int
    username: str
    role: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

def get_current_user(token: str = Depends(oauth2_scheme)):
    """Dependency to retrieve the currently logged-in user from the JWT token."""
    payload = security.decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de acceso inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    username = payload.get("sub")
    
    with database.get_db_connection() as conn:
        user = conn.execute("SELECT id, username, role, full_name, avatar_url FROM users WHERE username = ?", (username,)).fetchone()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return dict(user)

def get_current_admin(current_user: dict = Depends(get_current_user)):
    """Dependency to enforce admin-only route access."""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado: Se requieren privilegios de Administrador"
        )
    return current_user

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest):
    """Authenticate user and return a JWT access token."""
    with database.get_db_connection() as conn:
        user = conn.execute("SELECT * FROM users WHERE username = ?", (req.username,)).fetchone()
        
    if not user or not security.verify_password(req.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos"
        )
        
    access_token = security.create_access_token(data={"sub": user["username"]})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user["role"],
        "username": user["username"],
        "full_name": user["full_name"],
        "avatar_url": user["avatar_url"]
    }

@router.post("/register")
def register(req: RegisterRequest, current_admin: dict = Depends(get_current_admin)):
    """Register a new user (Restricted to logged-in Admins)."""
    with database.get_db_connection() as conn:
        existing_user = conn.execute("SELECT id FROM users WHERE username = ?", (req.username,)).fetchone()
        if existing_user:
            raise HTTPException(status_code=400, detail="El nombre de usuario ya está registrado")
            
        hashed_password = security.get_password_hash(req.password)
        conn.execute(
            "INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)",
            (req.username, hashed_password, req.role, req.full_name or req.username)
        )
        conn.commit()
        
    return {"message": f"Usuario {req.username} registrado con éxito con el rol {req.role}"}

@router.get("/me", response_model=UserProfile)
def get_me(current_user: dict = Depends(get_current_user)):
    """Retrieve details of the current logged-in user."""
    return current_user

@router.get("/users")
def list_users(current_admin: dict = Depends(get_current_admin)):
    """List all registered users (Admin-only)."""
    with database.get_db_connection() as conn:
        users = conn.execute("SELECT id, username, role, full_name, avatar_url FROM users").fetchall()
    return [dict(u) for u in users]

@router.delete("/users/{user_id}")
def delete_user(user_id: int, current_admin: dict = Depends(get_current_admin)):
    """Delete a user account (Admin-only, cannot delete oneself)."""
    if current_admin["id"] == user_id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta de administrador")
        
    with database.get_db_connection() as conn:
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
    return {"message": "Usuario eliminado correctamente"}

class UpdateUserRequest(BaseModel):
    role: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None

@router.put("/users/{user_id}")
def update_user(user_id: int, req: UpdateUserRequest, current_admin: dict = Depends(get_current_admin)):
    """Update a user's details (Admin-only)."""
    with database.get_db_connection() as conn:
        user = conn.execute("SELECT id, username, role FROM users WHERE id = ?", (user_id,)).fetchone()
        
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    updates = []
    params = []
    
    if req.role is not None:
        if current_admin["id"] == user_id and req.role != "admin":
            raise HTTPException(
                status_code=400,
                detail="No puedes quitarte el rol de administrador a ti mismo para prevenir bloqueos de acceso"
            )
        updates.append("role = ?")
        params.append(req.role)
        
    if req.full_name is not None:
        updates.append("full_name = ?")
        params.append(req.full_name)
        
    if req.password:
        hashed_password = security.get_password_hash(req.password)
        updates.append("password_hash = ?")
        params.append(hashed_password)
        
    if not updates:
        raise HTTPException(status_code=400, detail="No se especificaron cambios para actualizar")
        
    params.append(user_id)
    query = f"UPDATE users SET {', '.join(updates)} WHERE id = ?"
    
    with database.get_db_connection() as conn:
        conn.execute(query, tuple(params))
        conn.commit()
        
    return {"message": "Usuario actualizado correctamente"}

@router.put("/profile")
def update_profile(
    full_name: Optional[str] = Form(None),
    password: Optional[str] = Form(None),
    avatar: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    """Update details of the currently logged-in user."""
    updates = []
    params = []
    
    if full_name is not None:
        updates.append("full_name = ?")
        params.append(full_name)
        
    if password:
        hashed_password = security.get_password_hash(password)
        updates.append("password_hash = ?")
        params.append(hashed_password)
        
    if avatar:
        # Validate that it is an image
        content_type = avatar.content_type or ""
        if not content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")
        
        # Save file to media/avatars
        file_ext = Path(avatar.filename).suffix if avatar.filename else ".png"
        if not file_ext:
            file_ext = ".png"
        
        filename = f"{uuid.uuid4().hex}{file_ext}"
        filepath = config.AVATARS_DIR / filename
        
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(avatar.file, buffer)
            
        avatar_url = f"/media/avatars/{filename}"
        updates.append("avatar_url = ?")
        params.append(avatar_url)
        
    if not updates:
        raise HTTPException(status_code=400, detail="No se especificaron cambios para actualizar")
        
    params.append(current_user["id"])
    query = f"UPDATE users SET {', '.join(updates)} WHERE id = ?"
    
    with database.get_db_connection() as conn:
        conn.execute(query, tuple(params))
        conn.commit()
        
    # Get updated user data
    with database.get_db_connection() as conn:
        updated = conn.execute("SELECT id, username, role, full_name, avatar_url FROM users WHERE id = ?", (current_user["id"],)).fetchone()
        
    return dict(updated)
