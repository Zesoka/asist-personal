import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent

# Database Config
DB_PATH = os.getenv("DB_PATH", str(BASE_DIR / "hub_personal.db"))

# Security Config (JWT)
SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-hub-personal-key-for-jwt-tokens-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week

# AI Providers API Keys
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# Directory paths for uploads
MEDIA_DIR = BASE_DIR / "media"
ICONS_DIR = MEDIA_DIR / "icons"
NOTES_DIR = MEDIA_DIR / "notes"
AVATARS_DIR = MEDIA_DIR / "avatars"

# Ensure directories exist
ICONS_DIR.mkdir(parents=True, exist_ok=True)
NOTES_DIR.mkdir(parents=True, exist_ok=True)
AVATARS_DIR.mkdir(parents=True, exist_ok=True)
