from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import database
import config
from routers.auth import get_current_user

# AI providers imports
try:
    import google.genai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

router = APIRouter(prefix="/ai", tags=["ai"])

class AIChatRequest(BaseModel):
    message: str

class AIMessageResponse(BaseModel):
    role: str       # "user" or "assistant"
    content: str
    created_at: str

def generate_ai_response(history_list: List[dict]) -> str:
    """Sends the formatted chat history to the configured AI model and returns the response."""
    # System prompt to give the AI a feline assistant persona
    system_prompt = (
        "Eres 'Milo', el felino más inteligente del mundo y el asistente estrella de la aplicación "
        "Asistente - Organizador familiar. Contestas absolutamente todo, sabes todo y ayudas en todo. "
        "Tienes una personalidad sumamente astuta, extremadamente inteligente, atenta, servicial y "
        "con un toque felino juguetón y sabio. Ayudas a todos los miembros de la familia con tareas diarias, "
        "dudas generales, organización, cocina o soporte técnico. Sabe que eres un gatito superinteligente. "
        "Usa formato Markdown cuando sea necesario."
    )
    
    # 1. Try Gemini (default)
    if GEMINI_AVAILABLE and config.GEMINI_API_KEY:
        try:
            client = genai.Client(api_key=config.GEMINI_API_KEY)
            
            # Format history for Gemini contents parameter
            # We can format it as a single block for the model, prepending the system instruction
            contents = [system_prompt + "\n\nHistorial de conversación:"]
            for msg in history_list:
                role_label = "Familiar" if msg["role"] == "user" else "Milo (Tú)"
                contents.append(f"{role_label}: {msg['content']}")
            
            contents.append("Milo (Tú):")
            
            prompt = "\n".join(contents)
            
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt
            )
            return response.text
        except Exception as e:
            print(f"Gemini error: {e}")
            
    # 2. Try OpenAI (fallback)
    if OPENAI_AVAILABLE and config.OPENAI_API_KEY:
        try:
            client = OpenAI(api_key=config.OPENAI_API_KEY)
            messages = [{"role": "system", "content": system_prompt}]
            
            # Translate roles to OpenAI standard (user / assistant)
            for msg in history_list:
                messages.append({
                    "role": "user" if msg["role"] == "user" else "assistant",
                    "content": msg["content"]
                })
                
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"OpenAI error: {e}")
            
    # 3. Mock Fallback (if no API keys are provided)
    latest_msg = history_list[-1]["content"].lower()
    if "hola" in latest_msg:
        return "¡Miau! Hola, soy Milo, el felino más inteligente del mundo y tu asistente familiar. Sabelotodo, astuto y listo para ayudarte en todo lo que necesites. ¿Qué puedo hacer por ti hoy?"
    elif "cena" in latest_msg or "comer" in latest_msg:
        return "¡Miau! Como felino experto en delicias, sugeriría unas milanesas con puré, unas empanadas calientes o pedir sushi (¡el pescado es mi debilidad! 🐟). O si prefieres algo rápido, una buena pizza. 🍕"
    elif "clima" in latest_msg or "tiempo" in latest_msg:
        return "Mis bigotes me dicen que el clima está templado, pero para datos científicos exactos te recomiendo mirar afuera o consultar tu widget de clima en el Inicio. ¡Que tengas un día maullador!"
    else:
        return (
            "¡Miau! Recibí tu mensaje. (Nota: Modo demostración activo, configura `GEMINI_API_KEY` en tu `.env` para respuestas completas con IA).\n\n"
            f"Dijiste: \"{history_list[-1]['content']}\". Como el gato más inteligente, te sugiero coordinar las notas o consultar tu agenda familiar. ¿Qué hacemos?"
        )

@router.get("/history", response_model=List[AIMessageResponse])
def get_ai_history(current_user: dict = Depends(get_current_user)):
    """Fetch the logged-in user's chat history with the AI assistant."""
    with database.get_db_connection() as conn:
        rows = conn.execute("""
            SELECT role, content, created_at 
            FROM ai_conversations 
            WHERE user_id = ? 
            ORDER BY created_at ASC
        """, (current_user["id"],)).fetchall()
    return [dict(r) for r in rows]

@router.post("/chat")
def chat_with_assistant(req: AIChatRequest, current_user: dict = Depends(get_current_user)):
    """Process a message: save prompt, call AI, save and return AI response."""
    user_msg = req.message.strip()
    if not user_msg:
        raise HTTPException(status_code=400, detail="El mensaje no puede estar vacío")
        
    with database.get_db_connection() as conn:
        # Save user message
        conn.execute(
            "INSERT INTO ai_conversations (user_id, role, content) VALUES (?, 'user', ?)",
            (current_user["id"], user_msg)
        )
        conn.commit()
        
        # Load last 10 messages for context (latest first)
        rows = conn.execute("""
            SELECT role, content 
            FROM ai_conversations 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 10
        """, (current_user["id"],)).fetchall()
        
    # Reverse to restore chronological order
    history = [dict(r) for r in reversed(rows)]
    
    # Generate response
    ai_reply = generate_ai_response(history)
    
    # Save assistant response
    with database.get_db_connection() as conn:
        conn.execute(
            "INSERT INTO ai_conversations (user_id, role, content) VALUES (?, 'assistant', ?)",
            (current_user["id"], ai_reply)
        )
        conn.commit()
        
    return {"response": ai_reply}

@router.delete("/history")
def clear_ai_history(current_user: dict = Depends(get_current_user)):
    """Clear the logged-in user's AI conversation history."""
    with database.get_db_connection() as conn:
        conn.execute("DELETE FROM ai_conversations WHERE user_id = ?", (current_user["id"],))
        conn.commit()
    return {"message": "Historial del asistente borrado con éxito"}
