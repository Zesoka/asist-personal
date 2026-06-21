import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { api } from '../utils/api';
import { User, Upload, CheckCircle } from 'lucide-react';

export default function ProfileSettings() {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Pre-fill fields from local storage first
      setUsername(localStorage.getItem('username') || '');
      setFullName(localStorage.getItem('full_name') || '');
      setAvatarPreview(localStorage.getItem('avatar_url') || '');

      // Then fetch fresh data
      api.getMe().then((data) => {
        setFullName(data.full_name || '');
        setUsername(data.username || '');
        setAvatarPreview(data.avatar_url || '');
      }).catch((err) => {
        console.error("Error loading user profile:", err);
      });
    }
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setError('El archivo debe ser una imagen');
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('full_name', fullName);
    if (password) {
      formData.append('password', password);
    }
    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }

    try {
      const updatedUser = await api.updateProfile(formData);
      setSuccess('¡Perfil actualizado correctamente!');
      setFullName(updatedUser.full_name || '');
      setAvatarPreview(updatedUser.avatar_url || '');
      setPassword('');
      setAvatarFile(null);
      
      // Reload page to refresh Layout headers
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      setError(err.message || 'Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">⚙️ Mi Perfil</h1>
        <p className="page-description">Actualiza tu nombre completo, contraseña y foto de perfil.</p>
      </div>

      <div style={{ maxWidth: '600px' }}>
        <div className="glass-panel">
          <h3 style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <User size={20} /> Datos de Usuario
          </h3>

          {error && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '8px', color: '#f87171', padding: '10px 15px', fontSize: '0.85rem',
              marginBottom: '20px'
            }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{
              backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '8px', color: '#34d399', padding: '10px 15px', fontSize: '0.85rem',
              marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <CheckCircle size={16} /> <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Avatar Uploader Section */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
              <div style={{ position: 'relative' }}>
                {avatarPreview ? (
                  <img 
                    src={avatarPreview} 
                    alt="Avatar Preview" 
                    style={{ 
                      width: '100px', 
                      height: '100px', 
                      borderRadius: '50%', 
                      objectFit: 'cover',
                      border: '3px solid var(--accent-color)',
                      boxShadow: '0 4px 6px rgba(99,102,241,0.15)'
                    }} 
                  />
                ) : (
                  <div style={{ 
                    width: '100px', 
                    height: '100px', 
                    borderRadius: '50%', 
                    background: 'linear-gradient(135deg, var(--accent-color) 0%, #c084fc 100%)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '2rem',
                    boxShadow: '0 4px 6px rgba(99,102,241,0.15)'
                  }}>
                    {(fullName || username || '?').substring(0, 2).toUpperCase()}
                  </div>
                )}
                
                <label 
                  htmlFor="avatar-upload" 
                  style={{
                    position: 'absolute', bottom: '0', right: '0',
                    backgroundColor: 'var(--accent-color)', color: '#fff',
                    borderRadius: '50%', padding: '8px', cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                  title="Subir foto de perfil"
                >
                  <Upload size={14} />
                  <input 
                    type="file" 
                    id="avatar-upload"
                    accept="image/*" 
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Haz clic en el botón para cambiar tu foto de perfil</span>
            </div>

            {/* Username (Disabled) */}
            <div className="form-group">
              <label className="form-label">Nombre de Usuario (Fijo)</label>
              <input 
                type="text" 
                className="form-input" 
                value={username} 
                disabled 
                style={{ backgroundColor: 'rgba(255,255,255,0.01)', cursor: 'not-allowed', opacity: 0.7 }}
              />
            </div>

            {/* Full Name */}
            <div className="form-group">
              <label className="form-label">Nombre Completo</label>
              <input 
                type="text" 
                className="form-input" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                placeholder="Ej. Bruno Almiron"
                required
              />
            </div>

            {/* New Password */}
            <div className="form-group" style={{ marginBottom: '30px' }}>
              <label className="form-label">Nueva Contraseña (Opcional)</label>
              <input 
                type="password" 
                className="form-input" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Dejar vacío si no deseas cambiarla"
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '12px' }}
              disabled={loading}
            >
              {loading ? 'Guardando cambios...' : 'Actualizar Perfil'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
