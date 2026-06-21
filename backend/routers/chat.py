from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel
import database
import json
from typing import List
from routers.auth import get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatMessageCreate(BaseModel):
    message: str

class ChatMessageResponse(BaseModel):
    id: int
    user_id: int
    username: str
    message: str
    created_at: str

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message_data: dict):
        # Send json message to all active users
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message_data))
            except Exception:
                # If sending fails, connection might be dead
                pass

manager = ConnectionManager()

@router.get("/messages")
def get_chat_messages(limit: int = 50, current_user: dict = Depends(get_current_user)):
    """Fetch the latest messages from the family group chat."""
    with database.get_db_connection() as conn:
        rows = conn.execute("""
            SELECT chat_messages.*, users.username 
            FROM chat_messages 
            JOIN users ON chat_messages.user_id = users.id 
            ORDER BY chat_messages.created_at ASC 
            LIMIT ?
        """, (limit,)).fetchall()
        
    messages = []
    for r in rows:
        messages.append({
            "id": r["id"],
            "user_id": r["user_id"],
            "username": r["username"],
            "message": r["message"],
            "created_at": r["created_at"]
        })
    return messages

@router.post("/messages")
async def post_chat_message(msg: ChatMessageCreate, current_user: dict = Depends(get_current_user)):
    """Send a message via HTTP REST POST (fallback/standard message sending)."""
    if not msg.message.strip():
        raise HTTPException(status_code=400, detail="El mensaje no puede estar vacío")
        
    with database.get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO chat_messages (user_id, message) VALUES (?, ?)",
            (current_user["id"], msg.message)
        )
        conn.commit()
        msg_id = cursor.lastrowid
        
        # Retrieve message complete info to broadcast
        row = conn.execute("""
            SELECT chat_messages.*, users.username 
            FROM chat_messages 
            JOIN users ON chat_messages.user_id = users.id 
            WHERE chat_messages.id = ?
        """, (msg_id,)).fetchone()
        
    msg_data = {
        "id": row["id"],
        "user_id": row["user_id"],
        "username": row["username"],
        "message": row["message"],
        "created_at": row["created_at"]
    }
    
    # Broadcast message to all WebSocket listeners
    await manager.broadcast(msg_data)
    
    return msg_data

# Real-Time WebSocket Endpoint
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint to establish real-time chat sync."""
    await manager.connect(websocket)
    try:
        while True:
            # We listen for messages from client
            # The client sends JSON: {"token": "jwt...", "message": "hello"}
            data = await websocket.receive_text()
            payload = json.loads(data)
            
            # Simple token verification
            from security import decode_access_token
            user_payload = decode_access_token(payload.get("token", ""))
            
            if not user_payload:
                await websocket.send_text(json.dumps({"error": "No autorizado"}))
                continue
                
            username = user_payload.get("sub")
            message_text = payload.get("message", "").strip()
            
            if not message_text:
                continue
                
            with database.get_db_connection() as conn:
                # Get user id
                user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
                if not user:
                    continue
                    
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO chat_messages (user_id, message) VALUES (?, ?)",
                    (user["id"], message_text)
                )
                conn.commit()
                msg_id = cursor.lastrowid
                
                # Fetch complete data
                row = conn.execute("""
                    SELECT chat_messages.*, users.username 
                    FROM chat_messages 
                    JOIN users ON chat_messages.user_id = users.id 
                    WHERE chat_messages.id = ?
                """, (msg_id,)).fetchone()
                
            broadcast_data = {
                "id": row["id"],
                "user_id": row["user_id"],
                "username": row["username"],
                "message": row["message"],
                "created_at": row["created_at"]
            }
            
            await manager.broadcast(broadcast_data)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
