from fastapi import APIRouter, Depends, HTTPException, Response, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import re
import os
import io
import uuid
import json
import time
import tempfile
import yt_dlp
import config
from google import genai
from utils.document_generator import generate_md, generate_pdf, generate_docx
from routers.auth import get_current_user

router = APIRouter(prefix="/transcriber", tags=["transcriber"])

# Temp directory to store audio downloads and status tasks
TEMP_DOWNLOADS_DIR = os.path.join(tempfile.gettempdir(), "herramientas_it_downloads")
os.makedirs(TEMP_DOWNLOADS_DIR, exist_ok=True)

class ProcessVideoRequest(BaseModel):
    url: str
    provider: str  # "gemini", "openai", "mock"
    custom_api_key: Optional[str] = None

class ExportRequest(BaseModel):
    markdown_content: str
    format: str  # "md", "pdf", "docx"

def extract_video_id(url: str) -> Optional[str]:
    """Extracts the YouTube Video ID from a URL using Regex."""
    pattern = r'(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})'
    match = re.search(pattern, url)
    return match.group(1) if match else None

def get_video_title(url: str, video_id: str) -> str:
    """Uses yt-dlp to quickly get the video title without downloading the full video."""
    ydl_opts = {
        'skip_download': True,
        'extract_flat': True,
        'quiet': True,
        'no_warnings': True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return info.get('title', f"video_{video_id}")
    except Exception:
        return f"Transcripcion_YouTube_{video_id}"

def download_audio_via_ytdlp(video_id: str) -> str:
    """Downloads the YouTube audio stream directly as an m4a file without requiring ffmpeg."""
    url = f"https://www.youtube.com/watch?v={video_id}"
    outtmpl = os.path.join(TEMP_DOWNLOADS_DIR, f"{video_id}.%(ext)s")
    
    ydl_opts = {
        'format': '139/140/m4a/bestaudio/best',  # Prefer 48kbps (139) for max speed, then 128kbps (140)
        'outtmpl': outtmpl,
        'quiet': True,
        'no_warnings': True,
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])
        
    for ext in ['m4a', 'webm', 'mp3', 'aac', 'ogg', 'wav']:
        filepath = os.path.join(TEMP_DOWNLOADS_DIR, f"{video_id}.{ext}")
        if os.path.exists(filepath):
            return filepath
            
    raise Exception("No se pudo descargar el archivo de audio del video.")

def transcribe_and_format_audio(filepath: str, title: str, url: str, api_key: str) -> str:
    """Uploads the audio file to Google Gemini Files API, polls until processed, generates content, and deletes the remote file."""
    client = genai.Client(api_key=api_key)
    
    # 1. Upload file using Gemini Files API
    file_ref = client.files.upload(file=filepath)
    file_resource_name = file_ref.name
    
    try:
        # 2. Poll status until active
        from google.genai import types
        for _ in range(90):  # wait up to 3 minutes
            file_info = client.files.get(name=file_resource_name)
            if file_info.state == types.FileState.ACTIVE:
                break
            elif file_info.state == types.FileState.FAILED:
                raise Exception("El procesamiento del archivo falló en los servidores de Gemini.")
            time.sleep(2)
        else:
            raise Exception("Tiempo de espera agotado para el procesamiento del archivo en Gemini.")
            
        # 3. Generate instructions using gemini-2.5-flash
        prompt = (
            "Analiza de forma exhaustiva el siguiente audio de un video de soporte técnico, administración de sistemas o infraestructura.\n\n"
            "Tu tarea es actuar como un Ingeniero de Soporte Técnico Senior y generar un manual técnico o instructivo extremadamente detallado, completo y estructurado en español. "
            "Evita resúmenes cortos, explicaciones escuetas o simplificaciones. Queremos una guía exhaustiva donde se detalle cada paso con toda la información disponible en el audio.\n\n"
            "El documento final en Markdown debe estructurarse con las siguientes secciones:\n\n"
            "1. **Título Principal (#)**: Un título descriptivo y formal del procedimiento.\n"
            "2. **Introducción y Objetivos (##)**: Explica de manera detallada qué se logra con este procedimiento, la relevancia técnica y el contexto del sistema/herramienta descrita en el audio.\n"
            "3. **Requisitos Previos y Herramientas (##)**: Lista detallada de accesos necesarios, sistemas operativos compatibles, dependencias de software, herramientas físicas o digitales, comandos iniciales y configuraciones previas requeridas.\n"
            "4. **Guía Paso a Paso Detallada (##)**: Describe cronológicamente cada paso del procedimiento. Para cada paso:\n"
            "   - Explica el *qué*, el *cómo* y el *por qué* de la acción.\n"
            "   - Si el video menciona comandos de terminal, parámetros, scripts, configuraciones, switches de red, direcciones IP o sintaxis de código, "
            "escríbelos textualmente dentro de bloques de código en Markdown (```) indicando el lenguaje o shell (ej. bash, powershell, json, etc.). "
            "Añade comentarios o explicaciones de qué hace cada comando o parámetro.\n"
            "   - Detalla las respuestas del sistema esperadas, salidas de consola o confirmaciones visuales descritas.\n"
            "5. **Validación y Pruebas (##)**: Explica detalladamente cómo comprobar que el procedimiento se realizó con éxito (comandos de verificación, logs a revisar, pruebas de conectividad o funcionamiento).\n"
            "6. **Resolución de Problemas y Diagnósticos (##)**: Enumera los errores más comunes descritos o potenciales problemas que pueden surgir durante cada paso, y cómo solucionarlos.\n"
            "7. **Notas y Buenas Prácticas (##)**: Recomendaciones adicionales de seguridad, optimización o mantenimiento a largo plazo.\n\n"
            "Por favor, genera únicamente el documento Markdown estructurado y detallado, sin textos aclaratorios ni comentarios introductorios fuera del manual."
        )
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[file_info, prompt]
        )
        
        if not response.text:
            raise Exception("El modelo no generó texto.")
        return response.text
        
    finally:
        # 4. Clean up file resource from Gemini Files API
        try:
            client.files.delete(name=file_resource_name)
        except Exception as e:
            print(f"Error deleting file from Gemini Files: {e}")

def save_task_status(task_id: str, status_data: dict):
    """Saves the background task status to a temporary JSON file."""
    filepath = os.path.join(TEMP_DOWNLOADS_DIR, f"task_{task_id}.json")
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(status_data, f, ensure_ascii=False)
    except Exception:
        pass

def get_task_status_data(task_id: str) -> Optional[dict]:
    """Reads the background task status from the temporary JSON file."""
    filepath = os.path.join(TEMP_DOWNLOADS_DIR, f"task_{task_id}.json")
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return None

def bg_process_transcription(task_id: str, url: str, provider: str, custom_key: Optional[str]):
    """Asynchronous background task to process the video transcriptions/audio."""
    try:
        video_id = extract_video_id(url)
        if not video_id:
            save_task_status(task_id, {
                "status": "failed",
                "error": "URL de YouTube no válida."
            })
            return

        if provider == "mock":
            # Fast mock mode simulation
            time.sleep(2)
            tutorial = (
                "# Instructivo de Prueba: Despliegue de hub-personal\n\n"
                "Este es un tutorial ficticio de prueba.\n\n"
                "## Paso 1: Configurar Docker\n"
                "Asegúrate de que Docker Desktop está corriendo.\n\n"
                "## Paso 2: Ejecutar compose\n"
                "Ejecuta `docker-compose up -d` en tu terminal."
            )
            save_task_status(task_id, {
                "status": "completed",
                "tutorial": tutorial
            })
            return

        if provider == "openai":
            save_task_status(task_id, {
                "status": "failed",
                "error": "El proveedor OpenAI no está soportado para transcripción directa de audio en esta versión. Utilice Gemini."
            })
            return

        # Initialize API Key
        key = custom_key or config.GEMINI_API_KEY
        if not key:
            save_task_status(task_id, {
                "status": "failed",
                "error": "Falta API Key de Gemini. Configúrala en tu perfil o en el archivo .env"
            })
            return

        # 1. Fetch video details
        save_task_status(task_id, {
            "status": "processing",
            "message": "Obteniendo información del video desde YouTube..."
        })
        title = get_video_title(url, video_id)

        # 2. Download audio
        save_task_status(task_id, {
            "status": "processing",
            "message": "Descargando flujo de audio optimizado (m4a)..."
        })
        try:
            audio_path = download_audio_via_ytdlp(video_id)
        except Exception as e:
            save_task_status(task_id, {
                "status": "failed",
                "error": f"Error al descargar audio: {str(e)}"
            })
            return

        # 3. Transcribe and format
        save_task_status(task_id, {
            "status": "processing",
            "message": "Subiendo audio y transcribiendo con Gemini AI (esto puede tardar)..."
        })
        try:
            tutorial = transcribe_and_format_audio(audio_path, title, url, key)
        except Exception as e:
            save_task_status(task_id, {
                "status": "failed",
                "error": f"Error de Gemini AI: {str(e)}"
            })
            return
        finally:
            if os.path.exists(audio_path):
                try:
                    os.remove(audio_path)
                except Exception:
                    pass

        # 4. Save success status
        save_task_status(task_id, {
            "status": "completed",
            "tutorial": tutorial
        })

    except Exception as e:
        save_task_status(task_id, {
            "status": "failed",
            "error": f"Error inesperado en segundo plano: {str(e)}"
        })

@router.post("/process")
def process_video(
    req: ProcessVideoRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Starts the video processing in the background and returns a task ID."""
    video_id = extract_video_id(req.url)
    if not video_id:
        raise HTTPException(status_code=400, detail="URL de YouTube inválida")
        
    task_id = str(uuid.uuid4())
    save_task_status(task_id, {
        "status": "pending",
        "message": "Inicializando transcripción en segundo plano..."
    })
    
    background_tasks.add_task(bg_process_transcription, task_id, req.url, req.provider, req.custom_api_key)
    
    return {"task_id": task_id, "status": "pending"}

@router.get("/status/{task_id}")
def get_task_status(
    task_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Retrieves the status of a background task."""
    status_data = get_task_status_data(task_id)
    if not status_data:
        raise HTTPException(status_code=404, detail="Tarea no encontrada o expirada")
    return status_data

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
