import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { api } from '../utils/api';
import { UserPlus, Users, Trash2, Key } from 'lucide-react';

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [currentUsername, setCurrentUsername] = useState('');
  
  // Form states
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUsers();
      setCurrentUsername(localStorage.getItem('username') || '');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setSuccess('');

    if (!newUsername || !newPassword) {
      setMessage('Por favor completa todos los campos');
      return;
    }

    try {
      await api.registerUser(newUsername, newPassword, newRole);
      setSuccess(`¡Usuario ${newUsername} registrado con éxito!`);
      // Reset form
      setNewUsername('');
      setNewPassword('');
      setNewRole('user');
      
      // Refresh list
      fetchUsers();
    } catch (err) {
      setMessage(err.message || 'Error al registrar el usuario');
    }
  };

  const handleDelete = async (user) => {
    if (user.username === currentUsername) {
      alert('No puedes eliminar tu propia cuenta');
      return;
    }
    
    if (confirm(`¿Estás seguro de que quieres eliminar la cuenta de ${user.username}?`)) {
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
        
        {/* Register Member Form */}
        <div className="glass-panel">
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserPlus size={20} /> Registrar Integrante
          </h3>

          {message && (
            <div style={{ color: '#ef4444', marginBottom: '15px', fontSize: '0.9rem' }}>{message}</div>
          )}
          {success && (
            <div style={{ color: 'var(--success-color)', marginBottom: '15px', fontSize: '0.9rem' }}>{success}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Nombre de Usuario</label>
              <input 
                type="text" 
                className="form-input" 
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Ej. pedro, mama"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contraseña Inicial</label>
              <input 
                type="password" 
                className="form-input" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Ingresa clave temporal"
                required
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
              Añadir a la Familia
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
                  borderRadius: '10px', border: '1px solid var(--border-color)'
                }}
              >
                <div>
                  <strong style={{ color: '#fff' }}>{u.username}</strong>
                  <span style={{ 
                    display: 'inline-block', marginLeft: '10px', fontSize: '0.7rem', 
                    padding: '2px 8px', borderRadius: '12px',
                    backgroundColor: u.role === 'admin' ? 'rgba(168,85,247,0.15)' : 'rgba(99,102,241,0.15)',
                    color: u.role === 'admin' ? '#c084fc' : '#818cf8',
                    textTransform: 'uppercase', fontWeight: 'bold'
                  }}>
                    {u.role}
                  </span>
                </div>

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
            ))}
          </div>
        </div>

      </div>
    </Layout>
  );
}
