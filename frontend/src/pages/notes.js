import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { api } from '../utils/api';
import { Camera, FileText, Trash2, X } from 'lucide-react';
import CameraCapture from '../components/CameraCapture';

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [userId, setUserId] = useState(null);
  const [role, setRole] = useState('');
  
  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [cameraFile, setCameraFile] = useState(null);
  const [cameraPreview, setCameraPreview] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchNotes();
      // Fetch profile to get current user ID
      api.getMe()
        .then(profile => setUserId(profile.id))
        .catch(err => console.error(err));
    }
    setRole(localStorage.getItem('role') || '');
  }, []);

  const fetchNotes = async () => {
    try {
      const data = await api.listNotes();
      if (Array.isArray(data)) {
        setNotes(data);
      }
    } catch (err) {
      console.error('Error fetching notes:', err);
    }
  };

  const handleCapture = (file, previewUrl) => {
    setCameraFile(file);
    setCameraPreview(previewUrl);
    setShowCamera(false);
  };

  const clearCameraPhoto = () => {
    setCameraFile(null);
    setCameraPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    
    if (!title && !content) {
      setMessage('Escribe un título o descripción para guardar la nota');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('title', title || 'Nota sin título');
    formData.append('content', content || '');
    
    if (cameraFile) {
      formData.append('file', cameraFile);
    }

    try {
      await api.createNote(formData);
      // Reset form
      setTitle('');
      setContent('');
      clearCameraPhoto();
      fetchNotes();
    } catch (err) {
      setMessage(err.message || 'Error al guardar la nota');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta nota?')) {
      try {
        await api.deleteNote(id);
        fetchNotes();
      } catch (err) {
        console.error('Error deleting note:', err);
      }
    }
  };

  const formatDate = (dateStr) => {
    try {
      const dt = new Date(dateStr);
      return dt.toLocaleString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">📝 Notas Multimedia</h1>
        <p className="page-description">Escribe recordatorios rápidos y adjunta capturas de cámara al instante.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
        {/* Note Creator Form */}
        <div className="glass-panel" style={{ maxWidth: '600px' }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={20} /> Crear Nueva Nota
          </h3>

          {message && (
            <div style={{ color: '#ef4444', marginBottom: '15px', fontSize: '0.9rem' }}>{message}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Título</label>
              <input 
                type="text" 
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Lista de compras"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Descripción</label>
              <textarea 
                className="form-input"
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Escribe el contenido de la nota..."
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Adjuntar Foto</label>
              {!cameraPreview ? (
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowCamera(true)}
                  style={{ width: '100%' }}
                >
                  <Camera size={18} /> Tomar Foto con la Cámara
                </button>
              ) : (
                <div style={{ position: 'relative', marginTop: '10px' }}>
                  <img 
                    src={cameraPreview} 
                    alt="Preview" 
                    style={{ width: '100%', maxHeight: '250px', objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--border-color)' }} 
                  />
                  <button 
                    type="button" 
                    className="btn btn-danger" 
                    onClick={clearCameraPhoto}
                    style={{
                      position: 'absolute', top: '10px', right: '10px',
                      padding: '8px', borderRadius: '50%'
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '15px' }}
              disabled={loading}
            >
              {loading ? 'Guardando nota...' : 'Guardar Nota'}
            </button>
          </form>
        </div>

        {/* Camera Modal overlay */}
        {showCamera && (
          <CameraCapture 
            onCapture={handleCapture} 
            onClose={() => setShowCamera(false)} 
          />
        )}

        {/* Notes Feed */}
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ marginBottom: '20px' }}>📋 Notas Familiares</h3>
          
          {!Array.isArray(notes) || notes.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text-secondary)' }}>No hay notas guardadas. ¡Crea la primera!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {Array.isArray(notes) && notes.map((note) => {
                const canDelete = role === 'admin' || note.user_id === userId;
                return (
                  <div key={note.id} className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '15px' }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{note.title}</h4>
                        <div style={{ display: 'flex', gap: '15px', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
                          <span>✍️ Autor: <strong style={{ color: 'var(--accent-color)' }}>{note.author}</strong></span>
                          <span>🗓️ {formatDate(note.created_at)}</span>
                        </div>
                        <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>{note.content}</p>
                      </div>

                      {note.image_path && (
                        <div style={{ width: '150px', height: '150px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                          <img 
                            src={`http://localhost:8000${note.image_path}`} 
                            alt={note.title} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      )}
                    </div>

                    {canDelete && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid var(--border-color)' }}>
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => handleDelete(note.id)}
                          style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}
                        >
                          <Trash2 size={16} /> Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
