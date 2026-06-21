from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import re
import io
import config
from utils.document_generator import generate_md, generate_pdf, generate_docx
from routers.auth import get_current_user

# Transcription and AI dependencies imports
try:
    from youtube_transcript_api import YouTubeTranscriptApi
    YOUTUBE_TRANSCRIPT_AVAILABLE = True
except ImportError:
    YOUTUBE_TRANSCRIPT_AVAILABLE = False

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

router = APIRouter(prefix="/transcriber", tags=["transcriber"])

class ProcessVideoRequest(BaseModel):
    url: str
    provider: str  # "gemini", "openai", "mock"
    custom_api_key: Optional[str] = None

class ExportRequest(BaseModel):
    markdown_content: str
    format: str  # "md", "pdf", "docx"

def extract_video_id(url):
    pattern = r'(?:v=|\/)([0-9A-Za-z_-]{11})(?:\?|&|$)'
    match = re.search(pattern, url)
    return match.group(1) if match else None

def get_transcript(video_id):
    if not YOUTUBE_TRANSCRIPT_AVAILABLE:
        return None, "youtube-transcript-api no está instalada"
    try:
        transcript_list = YouTubeTranscriptApi().list(video_id)
        try:
            transcript = transcript_list.find_transcript(['es'])
        except Exception:
            try:
                transcript = transcript_list.find_transcript(['en'])
            except Exception:
                transcript = next(iter(transcript_list))
        data = transcript.fetch()
        return " ".join([item['text'] for item in data]), None
    except Exception as e:
        return None, str(e)

def run_gemini(text, api_key):
    if not GEMINI_AVAILABLE:
        return None, "google-genai no está instalada"
    key = api_key or config.GEMINI_API_KEY
    if not key:
        return None, "Falta API Key de Gemini"
    try:
        client = genai.Client(api_key=key)
        prompt = (
            "Eres un redactor técnico experto. A partir de la siguiente transcripción de un video "
            "de YouTube, redacta un instructivo/tutorial paso a paso, claro, detallado y profesional en español. "
            "Usa formato Markdown con encabezados, listas numeradas y bloques de código:\n\n"
            f"{text}"
        )
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        return response.text, None
    except Exception as e:
        return None, str(e)

def run_openai(text, api_key):
    if not OPENAI_AVAILABLE:
        return None, "openai no está instalada"
    key = api_key or config.OPENAI_API_KEY
    if not key:
        return None, "Falta API Key de OpenAI"
    try:
        client = OpenAI(api_key=key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Eres un redactor técnico experto. Convierte la transcripción en un instructivo estructurado en Markdown."},
                {"role": "user", "content": f"Redacta un instructivo paso a paso detallado en español:\n\n{text}"}
            ]
        )
        return response.choices[0].message.content, None
    except Exception as e:
        return None, str(e)

@router.post("/process")
def process_video(req: ProcessVideoRequest, current_user: dict = Depends(get_current_user)):
    """Process a YouTube video: extract transcripts and generate structured instructions using AI."""
    video_id = extract_video_id(req.url)
    if not video_id:
        raise HTTPException(status_code=400, detail="URL de YouTube inválida")
        
    if req.provider == "mock":
        tutorial = (
            "# Instructivo de Prueba: Despliegue de hub-personal\n\n"
            "Este es un tutorial ficticio de prueba.\n\n"
            "## Paso 1: Configurar Docker\n"
            "Asegúrate de que Docker Desktop está corriendo.\n\n"
            "## Paso 2: Ejecutar compose\n"
            "Ejecuta `docker-compose up -d` en tu terminal."
        )
        return {"tutorial": tutorial}
        
    # Get transcript
    transcript, error = get_transcript(video_id)
    if error:
        raise HTTPException(status_code=400, detail=f"Error obteniendo transcripción: {error}")
        
    # Generate content using AI
    tutorial = None
    ai_err = None
    if req.provider == "gemini":
        tutorial, ai_err = run_gemini(transcript, req.custom_api_key)
    elif req.provider == "openai":
        tutorial, ai_err = run_openai(transcript, req.custom_api_key)
    else:
        raise HTTPException(status_code=400, detail="Proveedor de IA no soportado")
        
    if ai_err:
        raise HTTPException(status_code=502, detail=f"Error de la API de IA: {ai_err}")
        
    return {"tutorial": tutorial}

@router.post("/export")
def export_tutorial(req: ExportRequest, current_user: dict = Depends(get_current_user)):
    """Export markdown text into downloadable MD, PDF, or DOCX formats."""
    content = req.markdown_content
    
    if req.format == "md":
        binary_data = generate_md(content)
        return Response(
            content=binary_data,
            media_type="text/markdown",
            headers={"Content-Disposition": "attachment; filename=instructivo.md"}
        )
    elif req.format == "pdf":
        binary_data = generate_pdf(content)
        return Response(
            content=binary_data,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=instructivo.pdf"}
        )
    elif req.format == "docx":
        binary_data = generate_docx(content)
        return Response(
            content=binary_data,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": "attachment; filename=instructivo.docx"}
        )
    else:
        raise HTTPException(status_code=400, detail="Formato de exportación no válido")
