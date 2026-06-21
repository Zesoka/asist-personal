import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { api } from '../utils/api';
import { Plus, Trash2 } from 'lucide-react';

export default function Shortcuts() {
  const [shortcuts, setShortcuts] = useState([]);
  const [role, setRole] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form states
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [iconType, setIconType] = useState('emoji');
  const [emoji, setEmoji] = useState('🔗');
  const [iconFile, setIconFile] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchShortcuts();
      setRole(localStorage.getItem('role') || '');
    }
  }, []);

  const fetchShortcuts = async () => {
    try {
      const data = await api.listShortcuts();
      if (Array.isArray(data)) {
        setShortcuts(data);
      }
    } catch (err) {
      console.error('Error fetching shortcuts:', err);
    }
  };

  const handleShortcutClick = async (shortcut) => {
    try {
      // Track click in backend
      await api.trackClick(shortcut.id);
      
      // Update local count
      setShortcuts(prev => prev.map(item => 
        item.id === shortcut.id ? { ...item, clicks: item.clicks + 1 } : item
      ));

      // Open URL in new window/tab
      window.open(shortcut.url, '_blank');
    } catch (err) {
      console.error('Error tracking click:', err);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setIconFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    
    if (!name || !url) {
      setMessage('Por favor, completa los campos obligatorios');
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('url', url);
    formData.append('icon_type', iconType);
    
    if (iconType === 'emoji') {
      formData.append('emoji', emoji);
    } else if (iconType === 'upload' && iconFile) {
      formData.append('file', iconFile);
    } else {
      formData.append('emoji', '🔗');
    }

    try {
      await api.createShortcut(formData);
      // Reset form
      setName('');
      setUrl('');
      setEmoji('🔗');
      setIconFile(null);
      setShowAddForm(false);
      // Refresh list
      fetchShortcuts();
    } catch (err) {
      setMessage(err.message || 'Error al guardar el acceso directo');
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // Avoid triggering click counter
    if (window.confirm('¿Estás seguro de que quieres eliminar este acceso directo?')) {
      try {
        await api.deleteShortcut(id);
        fetchShortcuts();
      } catch (err) {
        console.error('Error deleting shortcut:', err);
      }
    }
  };

  return (
    <Layout>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 className="page-title">🔗 Accesos Directos</h1>
          <p className="page-description">Tus sitios web de uso diario a un solo clic.</p>
        </div>
        {role === 'admin' && (
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus size={18} />
            <span>{showAddForm ? 'Cerrar Formulario' : 'Añadir Acceso'}</span>
          </button>
        )}
      </div>

      {showAddForm && role === 'admin' && (
        <div className="glass-panel" style={{ marginBottom: '30px', maxWidth: '600px' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '750' }}>➕ Crear Acceso Directo</h3>
          
          {message && (
            <div style={{ color: '#ef4444', marginBottom: '15px', fontSize: '0.9rem' }}>{message}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Nombre del Sitio *</label>
              <input 
                type="text" 
                className="form-input" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Ej. GitHub"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">URL / Dirección *</label>
              <input 
                type="text" 
                className="form-input" 
                value={url} 
                onChange={(e) => setUrl(e.target.value)} 
                placeholder="Ej. github.com"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tipo de Icono</label>
              <div style={{ display: 'flex', gap: '20px', marginBottom: '10px', fontSize: '0.9rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="iconType" 
                    checked={iconType === 'emoji'} 
                    onChange={() => setIconType('emoji')} 
                  />
                  <span>Emoji</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="iconType" 
                    checked={iconType === 'upload'} 
                    onChange={() => setIconType('upload')} 
                  />
                  <span>Subir Imagen (SVG/PNG)</span>
                </label>
              </div>
            </div>

            {iconType === 'emoji' ? (
              <div className="form-group">
                <label className="form-label">Emoji</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={emoji} 
                  onChange={(e) => setEmoji(e.target.value)} 
                  placeholder="Ej. 💻"
                />
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Seleccionar Icono Personalizado</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ color: 'var(--text-secondary)' }}
                />
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
              Guardar Acceso Directo
            </button>
          </form>
        </div>
      )}

      {!Array.isArray(shortcuts) || shortcuts.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No hay accesos directos guardados.</p>
          {role === 'admin' && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '5px' }}>Haz clic en "Añadir Acceso" para crear uno.</p>}
        </div>
      ) : (
        <div className="shortcuts-grid">
          {shortcuts.map((sh) => {
            const isCustomIcon = sh.icon_path.startsWith('/media/');
            return (
              <div 
                key={sh.id} 
                className="shortcut-card"
                onClick={() => handleShortcutClick(sh)}
              >
                <div className="shortcut-icon">
                  {isCustomIcon ? (
                    <img src={`${sh.icon_path}`} alt={sh.name} />
                  ) : (
                    sh.icon_path
                  )}
                </div>
                <div className="shortcut-name">{sh.name}</div>
                <div className="shortcut-clicks">Clicks: {sh.clicks}</div>

                {role === 'admin' && (
                  <button
                    className="btn"
                    onClick={(e) => handleDelete(e, sh.id)}
                    style={{
                      position: 'absolute', top: '10px', right: '10px',
                      padding: '5px', backgroundColor: 'transparent', color: 'var(--text-muted)',
                      border: 'none', cursor: 'pointer'
                    }}
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
