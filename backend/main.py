from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import database
import config

# Import routers
from routers import auth, shortcuts, notes, calendar, chat, transcriber, ai_assistant, dashboard

app = FastAPI(
    title="hub-personal API",
    description="Backend API for the hub-personal family productivity dashboard",
    version="1.0.0"
)

# Configure CORS to allow frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual frontend origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup DB initialization
@app.on_event("startup")
def on_startup():
    database.init_db()

# Serve uploaded media (note images, custom shortcut icons)
app.mount("/media", StaticFiles(directory=str(config.MEDIA_DIR)), name="media")

# Register routers
app.include_router(auth.router)
app.include_router(shortcuts.router)
app.include_router(notes.router)
app.include_router(calendar.router)
app.include_router(chat.router)
app.include_router(transcriber.router)
app.include_router(ai_assistant.router)
app.include_router(dashboard.router)

@app.get("/health")
def health_check():
    """Endpoint for Docker healthchecks."""
    return {"status": "ok", "service": "hub-personal-api"}

@app.get("/")
def read_root():
    return {"message": "Bienvenido a la API de hub-personal. Ve a /docs para la documentación interactiva."}
