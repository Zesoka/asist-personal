import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { api } from '../utils/api';
import { UserPlus, Users, Trash2, Pencil, X } from 'lucide-react';

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [currentUsername, setCurrentUsername] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  
  // Form states
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [newFullName, setNewFullName] = useState('');

  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUsers();
      setCurrentUsername(localStorage.getItem('username') || '');
      
      api.getMe().then((data) => {
        if (data.id) setCurrentUserId(data.id);
      }).catch(err => console.error(err));
    }
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await api.listUsers();
      if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const handleStartEdit = (user) => {
    setIsEditing(true);
    setEditingUserId(user.id);
    setNewUsername(user.username);
    setNewFullName(user.full_name || '');
    setNewRole(user.role);
    setNewPassword(''); // leave blank unless changing it
    setMessage('');
    setSuccess('');
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingUserId(null);
    setNewUsername('');
    setNewFullName('');
    setNewRole('user');
    setNewPassword('');
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setSuccess('');

    if (isEditing) {
      try {
        await api.updateUser(editingUserId, {
          role: newRole,
          full_name: newFullName,
          password: newPassword || undefined
        });
        setSuccess(`¡Usuario ${newUsername} actualizado con éxito!`);
        resetForm();
        fetchUsers();
        
        // If the edited user is the logged-in user, reload to sync Layout display
        if (editingUserId === currentUserId) {
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      } catch (err) {
        setMessage(err.message || 'Error al actualizar el usuario');
      }
    } else {
      if (!newUsername || !newPassword) {
        setMessage('Por favor completa todos los campos');
        return;
      }

      try {
        await api.registerUser(newUsername, newPassword, newRole, newFullName);
        setSuccess(`¡Usuario ${newUsername} registrado con éxito!`);
        resetForm();
        fetchUsers();
      } catch (err) {
        setMessage(err.message || 'Error al registrar el usuario');
      }
    }
  };

  const handleDelete = async (user) => {
    if (user.username === currentUsername) {
      alert('No puedes eliminar tu propia cuenta');
      return;
    }
    
    if (confirm(`¿Estás seguro de que quieres eliminar la cuenta de ${user.full_name || user.username}?`)) {
      try {
        await api.deleteUser(user.id);
        fetchUsers();
      } catch (err) {
        console.error('Error deleting user:', err);
      }
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">👥 Panel de Familia (Administración)</h1>
        <p className="page-description">Administra los accesos y los miembros registrados en el Hub Familiar.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
        
        {/* Register / Edit Member Form */}
        <div className="glass-panel">
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <UserPlus size={20} /> {isEditing ? `Editar Integrante: ${newUsername}` : 'Registrar Integrante'}
            </span>
            {isEditing && (
              <button 
                onClick={resetForm}
                style={{
                  border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem'
                }}
              >
                <X size={14} /> Cancelar
              </button>
            )}
          </h3>

          {message && (
            <div style={{ color: '#ef4444', marginBottom: '15px', fontSize: '0.9rem' }}>{message}</div>
          )}
          {success && (
            <div style={{ color: 'var(--success-color)', marginBottom: '15px', fontSize: '0.9rem' }}>{success}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Nombre de Usuario *</label>
              <input 
                type="text" 
                className="form-input" 
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Ej. pedro, mama"
                required
                disabled={isEditing}
                style={isEditing ? { backgroundColor: 'rgba(255,255,255,0.02)', cursor: 'not-allowed', opacity: 0.7 } : {}}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Nombre Completo</label>
              <input 
                type="text" 
                className="form-input" 
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="Ej. Pedro Almiron"
              />
            </div>

            <div className="form-group">
              <label className="form-label">{isEditing ? 'Nueva Contraseña (Opcional)' : 'Contraseña Inicial *'}</label>
              <input 
                type="password" 
                className="form-input" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={isEditing ? 'Dejar vacío si no deseas cambiarla' : 'Ingresa clave temporal'}
                required={!isEditing}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '25px' }}>
              <label className="form-label">Rol del Integrante</label>
              <select 
                className="form-input"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                <option value="user">Usuario (Familiar)</option>
                <option value="admin">Administrador (Control total)</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              {isEditing ? 'Guardar Cambios' : 'Añadir a la Familia'}
            </button>
          </form>
        </div>

        {/* Family list */}
        <div className="glass-panel">
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={20} /> Cuentas Registradas
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Array.isArray(users) && users.map((u) => (
              <div 
                key={u.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 18px', backgroundColor: 'rgba(255,255,255,0.02)',
                  borderRadius: '12px', border: '1px solid var(--border-color)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                  {u.avatar_url ? (
                    <img 
                      src={u.avatar_url} 
                      alt="Avatar" 
                      style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <div style={{ 
                      width: '36px', height: '36px', borderRadius: '50%', 
                      background: 'linear-gradient(135deg, var(--accent-color) 0%, #c084fc 100%)',
                      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: '700', fontSize: '0.8rem'
                    }}>
                      {(u.full_name || u.username || '?').substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: '0' }}>
                    <strong style={{ 
                      color: '#fff', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' 
                    }}>
                      {u.full_name || u.username}
                    </strong>
                    {u.full_name && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{u.username}</span>
                    )}
                  </div>
                  
                  <span style={{ 
                    fontSize: '0.65rem', 
                    padding: '2px 8px', borderRadius: '12px',
                    backgroundColor: u.role === 'admin' ? 'rgba(168,85,247,0.15)' : 'rgba(99,102,241,0.15)',
                    color: u.role === 'admin' ? '#c084fc' : '#818cf8',
                    textTransform: 'uppercase', fontWeight: 'bold'
                  }}>
                    {u.role}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button 
                    className="btn" 
                    onClick={() => handleStartEdit(u)}
                    style={{ padding: '6px', backgroundColor: 'transparent', color: 'var(--text-muted)' }}
                    title="Editar cuenta"
                  >
                    <Pencil size={16} />
                  </button>
                  
                  {u.username !== currentUsername && (
                    <button 
                      className="btn" 
                      onClick={() => handleDelete(u)}
                      style={{ padding: '6px', backgroundColor: 'transparent', color: 'var(--text-muted)' }}
                      title="Eliminar cuenta"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </Layout>
  );
}
