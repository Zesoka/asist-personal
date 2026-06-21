const API_URL = '/api';

// Helper to get authorization headers
export function getHeaders(isFormData = false) {
  const headers = {};
  
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

export const api = {
  // --- AUTH SERVICES ---
  async login(username, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Error al iniciar sesión');
    }
    const data = await res.json();
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('role', data.role);
    localStorage.setItem('username', data.username);
    return data;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
  },

  async getMe() {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('No autorizado');
    return res.json();
  },

  async listUsers() {
    const res = await fetch(`${API_URL}/auth/users`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error al listar usuarios');
    return res.json();
  },

  async registerUser(username, password, role) {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ username, password, role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Error al registrar usuario');
    }
    return res.json();
  },

  async deleteUser(userId) {
    const res = await fetch(`${API_URL}/auth/users/${userId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error al eliminar usuario');
    return res.json();
  },

  // --- SHORTCUTS SERVICES ---
  async listShortcuts() {
    const res = await fetch(`${API_URL}/shortcuts/`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error al obtener accesos directos');
    return res.json();
  },

  async createShortcut(formData) {
    const res = await fetch(`${API_URL}/shortcuts/`, {
      method: 'POST',
      headers: getHeaders(true),
      body: formData
    });
    if (!res.ok) throw new Error('Error al guardar acceso directo');
    return res.json();
  },

  async trackClick(id) {
    const res = await fetch(`${API_URL}/shortcuts/${id}/click`, {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  async deleteShortcut(id) {
    const res = await fetch(`${API_URL}/shortcuts/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return res.json();
  },

  // --- NOTES SERVICES ---
  async listNotes() {
    const res = await fetch(`${API_URL}/notes/`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error al obtener notas');
    return res.json();
  },

  async createNote(formData) {
    const res = await fetch(`${API_URL}/notes/`, {
      method: 'POST',
      headers: getHeaders(true),
      body: formData
    });
    if (!res.ok) throw new Error('Error al guardar la nota');
    return res.json();
  },

  async deleteNote(id) {
    const res = await fetch(`${API_URL}/notes/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return res.json();
  },

  // --- CALENDAR SERVICES ---
  async listFamilyEvents(startDate, endDate) {
    let url = `${API_URL}/calendar/events`;
    if (startDate && endDate) {
      url += `?start_date=${startDate}&end_date=${endDate}`;
    }
    const res = await fetch(url, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error al obtener eventos familiares');
    return res.json();
  },

  async createFamilyEvent(eventData) {
    const res = await fetch(`${API_URL}/calendar/events`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(eventData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Error al guardar el evento');
    }
    return res.json();
  },

  async deleteFamilyEvent(id) {
    const res = await fetch(`${API_URL}/calendar/events/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return res.json();
  },

  async getGoogleEvents(startDate, endDate) {
    let url = `${API_URL}/calendar/google-events`;
    if (startDate && endDate) {
      url += `?start_date=${startDate}&end_date=${endDate}`;
    }
    const res = await fetch(url, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error al obtener eventos de Google');
    return res.json();
  },

  async getGoogleAuthUrl() {
    const res = await fetch(`${API_URL}/calendar/auth-url`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error al obtener URL de autorización de Google');
    return res.json();
  },

  async uploadGoogleCredentials(formData) {
    const res = await fetch(`${API_URL}/calendar/upload-credentials`, {
      method: 'POST',
      headers: getHeaders(true),
      body: formData
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Error al subir las credenciales de Google');
    }
    return res.json();
  },

  // --- CHAT SERVICES ---
  async getChatHistory() {
    const res = await fetch(`${API_URL}/chat/messages`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error al obtener historial de chat');
    return res.json();
  },

  async sendChatMessage(message) {
    const res = await fetch(`${API_URL}/chat/messages`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ message })
    });
    return res.json();
  },

  getWebSocketUrl() {
    const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const wsProtocol = isSecure ? 'wss:' : 'ws:';
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost:8000';
    return `${wsProtocol}//${host}/api/chat/ws`;
  },

  // --- TRANSCRIBER SERVICES ---
  async processVideo(url, provider, customApiKey = null) {
    const res = await fetch(`${API_URL}/transcriber/process`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ url, provider, custom_api_key: customApiKey })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Error procesando el video');
    }
    return res.json();
  },

  async downloadTutorial(markdownContent, format) {
    const res = await fetch(`${API_URL}/transcriber/export`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ markdown_content: markdownContent, format })
    });
    if (!res.ok) throw new Error('Error al exportar documento');
    return res.blob();
  },

  // --- AI ASSISTANT SERVICES ---
  async getAIHistory() {
    const res = await fetch(`${API_URL}/ai/history`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error al obtener historial del asistente');
    return res.json();
  },

  async sendAIChatMessage(message) {
    const res = await fetch(`${API_URL}/ai/chat`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ message })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Error al comunicarse con la IA');
    }
    return res.json();
  },

  async clearAIHistory() {
    const res = await fetch(`${API_URL}/ai/history`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error al vaciar historial del asistente');
    return res.json();
  },

  // --- DASHBOARD SERVICES ---
  async getDashboardNews() {
    const res = await fetch(`${API_URL}/dashboard/news`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error al obtener noticias');
    return res.json();
  }
};
