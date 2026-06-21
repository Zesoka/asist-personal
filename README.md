# ⚡ hub-personal

Un **Hub Personal de Productividad** diseñado con interfaz responsiva moderna para funcionar fluidamente en navegadores de PC y móviles (ej. Chrome en iPhone). 

Construido utilizando **Streamlit**, **Python**, **SQLite**, y empaquetado con **Docker & Docker Compose**.

---

## 🚀 Funcionalidades Core

1. **🔗 Accesos Directos (1-Clic):** Panel de favoritos para redirigir rápidamente a tus páginas web más visitadas. Cuenta con contador de clicks persistente en base de datos.
2. **📝 Notas Multimedia:** Módulo de notas enriquecidas que utiliza `st.camera_input`. En dispositivos móviles (ej. iPhone), abre la cámara nativa para tomar una foto y guardarla adjunta a tu nota en SQLite.
3. **📅 Agenda Diaria:** Sincronización con la API de Google Calendar para listar los eventos del día actual en una línea de tiempo elegante.
4. **📖 Generador de Instructivos (YouTube a Doc):** Convierte cualquier video de YouTube en un instructivo estructurado paso a paso utilizando IA (Gemini/OpenAI). Ofrece descargas del resultado en formatos `.md`, `.pdf` y `.docx`.

---

## 🛠️ Estructura del Proyecto

```text
hub-personal/
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── README.md
├── app.py                  # Punto de entrada de Streamlit y enrutamiento
├── config.py               # Variables de entorno y rutas fijas
├── database.py             # Lógica e inicialización de SQLite
├── modules/                # Vistas y lógica específica de cada módulo
│   ├── __init__.py
│   ├── shortcuts.py        # Módulo de Accesos Directos
│   ├── notes.py            # Módulo de Notas Multimedia con Cámara
│   ├── calendar.py         # Módulo de Agenda Diaria (Google Calendar)
│   └── transcriber.py      # Módulo de Transcriptor & LLM (YouTube a Doc)
└── utils/                  # Herramientas de utilidad del sistema
    ├── __init__.py
    └── document_generator.py # Generador de exportables (MD, PDF, DOCX)
```

---

## 🐳 Despliegue con Docker y Docker Compose

### Requisitos Previos
- Tener instalado [Docker](https://www.docker.com/) y [Docker Compose](https://docs.docker.com/compose/).

### Pasos para iniciar el Hub
1. Crea un archivo `.env` en la raíz del proyecto para definir tus llaves API opcionales (o configúralas directo en la UI del hub):
   ```env
   GEMINI_API_KEY=tu_gemini_api_key_aqui
   OPENAI_API_KEY=tu_openai_api_key_aqui
   ```
2. Construye y levanta los contenedores en segundo plano:
   ```bash
   docker-compose up -d --build
   ```
3. Accede al Hub desde tu navegador:
   - **PC / Local:** [http://localhost:8501](http://localhost:8501)
   - **Móvil (Misma red WiFi):** `http://<IP-DE-TU-PC>:8501`

Para detener el servicio:
```bash
docker-compose down
```

---

## ⚙️ Configuración de API Externas

### 1. Google Calendar (Agenda Diaria)
Para activar la sincronización real con tu calendario:
1. Ve a [Google Cloud Console](https://console.cloud.google.com/).
2. Crea un proyecto y habilita **Google Calendar API**.
3. Configura la pantalla de consentimiento de OAuth y crea una credencial de tipo **OAuth Client ID** (Escoge tipo "Desktop Application").
4. Descarga el archivo JSON de credenciales, renombralo como `credentials.json` y colócalo en la raíz de este proyecto.
5. Al abrir la vista de Agenda Diaria en la aplicación, desactiva el **Mock Mode** y realiza la autenticación por única vez. Se creará un archivo `token.json` local persistente.

### 2. Generador de Instructivos (Gemini / OpenAI)
- Por defecto, puedes usar la pestaña de **Mock Mode** en la UI para probar el flujo sin API Key.
- Para usar producción, coloca tus tokens en el archivo `.env` o ingrésalos directamente en la caja de texto segura dentro de la sección "IA" en la pestaña del generador.
