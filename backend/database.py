import sqlite3
from pathlib import Path
import config
import security

def get_db_connection():
    """Returns a connection to the SQLite database with Row factory."""
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes all database tables and seeds a default admin user."""
    db_file = Path(config.DB_PATH)
    db_file.parent.mkdir(parents=True, exist_ok=True)
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # 1. Users Table (RBAC)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL,
                avatar_url TEXT
            )
        """)
        
        cursor.execute("PRAGMA table_info(users)")
        columns = [row[1] for row in cursor.fetchall()]
        if 'full_name' not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN full_name TEXT")
        
        # 2. Shortcuts Table (with custom icon support)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS shortcuts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                url TEXT NOT NULL,
                icon_path TEXT NOT NULL,
                clicks INTEGER DEFAULT 0
            )
        """)
        
        # 3. Multimedia Notes Table (bound to user)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                image_path TEXT,
                user_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        
        # 4. Family Group Chat Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        
        # 5. Shared Family Events Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS family_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        
        # 6. AI Conversations Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ai_conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        
        # Seed default Admin user if empty
        cursor.execute("SELECT COUNT(*) FROM users")
        if cursor.fetchone()[0] == 0:
            admin_pw_hash = security.get_password_hash("admin123")
            cursor.execute(
                "INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)",
                ("admin", admin_pw_hash, "admin", "Bruno Almiron")
            )
        else:
            cursor.execute(
                "UPDATE users SET full_name = 'Bruno Almiron' WHERE username IN ('admin', 'balmiron') AND (full_name IS NULL OR full_name = '')"
            )
            
        # Seed some default shortcuts if empty
        cursor.execute("SELECT COUNT(*) FROM shortcuts")
        if cursor.fetchone()[0] == 0:
            default_shortcuts = [
                ("Google", "https://www.google.com", "🔍", 0),
                ("GitHub", "https://github.com", "💻", 0),
                ("YouTube", "https://www.youtube.com", "📺", 0)
            ]
            cursor.executemany(
                "INSERT INTO shortcuts (name, url, icon_path, clicks) VALUES (?, ?, ?, ?)",
                default_shortcuts
            )
            
        conn.commit()
