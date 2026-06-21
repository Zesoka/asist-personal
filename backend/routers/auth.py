from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import Optional
import database
import security

router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str = "user"  # "admin" or "user"

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str

class UserProfile(BaseModel):
    id: int
    username: str
    role: str
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
        user = conn.execute("SELECT id, username, role, avatar_url FROM users WHERE username = ?", (username,)).fetchone()
    
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
        "username": user["username"]
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
            "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
            (req.username, hashed_password, req.role)
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
        users = conn.execute("SELECT id, username, role, avatar_url FROM users").fetchall()
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
