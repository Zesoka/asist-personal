# ⚡ Asistente - Organizador Familiar

Un **Hub Personal de Productividad y Organizador Familiar** diseñado con una interfaz responsiva moderna y estética premium (*Slate/Indigo light theme*) para funcionar fluidamente en navegadores de PC y móviles (ej. Chrome en iPhone).

Construido utilizando **Next.js (React)** para el frontend, **FastAPI (Python)** para el backend de alto rendimiento, **SQLite** como base de datos persistente, y empaquetado completo con **Docker & Docker Compose**.

---

## 🚀 Funcionalidades Core

1. **🔗 Accesos Directos (Página de Entrada):** Panel de favoritos para redirigir rápidamente a tus páginas web más visitadas. Cuenta con contador de clics persistente y soporte para subir iconos personalizados (PNG/SVG) o utilizar emojis tradicionales.
2. **📊 Dashboard de Inicio (`/dashboard`):** Centro de información que contiene:
   * **Clima Local:** Pronóstico actual y a 3 días con geolocalización automática del navegador y conexión a la API de Open-Meteo.
   * **Cotización del Dólar:** Precios de compra y venta para Dólar Oficial y Dólar Blue actualizados en tiempo real mediante DolarAPI.
   * **Principales Noticias:** Lector y parseador de noticias regionales estructurado en el backend para evitar bloqueos de CORS.
   * **Resultados Mundial 2026:** Panel compacto con los últimos resultados de los partidos del Mundial 2026.
3. **📝 Notas Multimedia:** Módulo de notas enriquecidas que permite redactar texto y tomar capturas fotográficas en tiempo real utilizando la cámara del dispositivo móvil o PC (mediante la API Canvas/getUserMedia de HTML5).
4. **📅 Calendario Familiar:** Sincronización con la API de Google Calendar para listar los eventos y citas familiares del día en una línea de tiempo elegante.
5. **💬 Chat Familiar:** Sala de chat en tiempo real utilizando WebSockets persistentes para comunicación instantánea entre los miembros de la familia.
6. **🤖 Asistente de IA (Milo):** Chat con **Milo**, el felino más inteligente del mundo. Milo posee memoria de contexto, chips de sugerencias rápidas, íconos personalizados de gatito y es impulsado por la API de Gemini (o OpenAI) con respuestas ingeniosas y sumamente completas.
7. **📖 YouTube a Doc:** Convierte cualquier video de YouTube en un instructivo estructurado paso a paso mediante IA. Ofrece descargas del resultado en formatos `.md`, `.pdf` y `.docx`.
8. **👥 Panel de Administración:** Panel exclusivo para usuarios con rol `admin` que permite registrar nuevos miembros de la familia y asignarles roles (`admin` / `user`).

---

## 🛠️ Estructura del Proyecto

```text
asist-personal/
├── docker-compose.yml       # Orquestador de contenedores (Frontend + Backend)
├── README.md
├── .gitignore
├── .env.example             # Plantilla de configuración de variables de entorno
│
├── backend/                 # API REST & WebSockets (FastAPI + Python)
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py              # Punto de entrada de la API y registro de routers
│   ├── database.py          # Conexión, schemas e inicialización de SQLite
│   ├── security.py          # Autenticación JWT y hash de contraseñas (bcrypt)
│   ├── config.py            # Lectura de variables de entorno y directorios
│   ├── routers/             # Endpoints modulares (auth, chat, notes, ai, etc.)
│   └── utils/               # Generador de documentos exportables (PDF/Word)
│
└── frontend/                # Aplicación Web React (Next.js)
    ├── Dockerfile
    ├── package.json
    ├── next.config.js
    └── src/
        ├── styles/
        │   └── globals.css  # Tema personalizado Light Slate & Indigo
        ├── components/
        │   ├── Layout.js    # Sidebar, control de sesión de usuario y navegación
        │   └── CameraCapture.js # Mapeo de cámara HTML5 y captura Canvas
        ├── utils/
        │   └── api.js       # Cliente API con inyección automática de Token JWT
        └── pages/           # Vistas (login, index, dashboard, transcriber, etc.)
```

---

## 🐳 Despliegue con Docker y Docker Compose

### Requisitos Previos
* Tener instalado [Docker Desktop](https://www.docker.com/) y [Docker Compose](https://docs.docker.com/compose/).

### Pasos para levantar el entorno
1. Crea un archivo `.env` en la raíz del proyecto basándote en la plantilla `.env.example`:
   ```bash
   cp .env.example .env
   ```
   *(Si utilizas Windows PowerShell, puedes copiarlo con `Copy-Item .env.example .env`)*. Completa tus API Keys (Gemini o OpenAI) si deseas activar el asistente Milo con inteligencia real, o déjalas vacías para usar las respuestas simuladas locales.
   
2. Construye y levanta los servicios:
   ```bash
   docker-compose up -d --build
   ```

3. Accede a las aplicaciones en tu navegador:
   * **Frontend Web Application:** [http://localhost:8501](http://localhost:8501)
   * **Backend API Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)

4. **Credenciales por defecto:**
   * **Usuario:** `admin`
   * **Contraseña:** `admin123`
   *(Se recomienda crear nuevos usuarios desde el panel de Administración y eliminar o cambiar las contraseñas predeterminadas).*

Para detener los servicios:
```bash
docker-compose down
```

---

## ⚙️ Configuración de API Externas

### 1. Google Calendar (Agenda Diaria)
Para activar la sincronización real con tu calendario familiar:
1. Ve a [Google Cloud Console](https://console.cloud.google.com/).
2. Crea un proyecto y habilita **Google Calendar API**.
3. Configura la pantalla de consentimiento de OAuth y crea una credencial de tipo **OAuth Client ID** (Escoge tipo "Desktop Application").
4. Descarga el archivo JSON de credenciales, renombralo como `credentials.json` y colócalo en el directorio `/backend` de este proyecto.
5. Al abrir la vista de Agenda Diaria en la aplicación, realiza la autenticación por única vez. Se creará un archivo `token.json` local persistente dentro de la carpeta del backend.
