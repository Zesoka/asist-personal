import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { 
  Home,
  Link2,
  FileText, 
  Calendar, 
  MessageSquare, 
  Users, 
  LogOut,
  Sparkles,
  Cat
} from 'lucide-react';
import { api } from '../utils/api';

export default function Layout({ children }) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('');
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    } else {
      setUsername(localStorage.getItem('username') || '');
      setRole(localStorage.getItem('role') || '');
      setFullName(localStorage.getItem('full_name') || '');
      setAvatarUrl(localStorage.getItem('avatar_url') || '');
      setLoading(false);

      // Keep user profile data in sync
      api.getMe().then((data) => {
        if (data.username) {
          setUsername(data.username);
          setRole(data.role);
          setFullName(data.full_name || '');
          setAvatarUrl(data.avatar_url || '');
          localStorage.setItem('username', data.username);
          localStorage.setItem('role', data.role);
          localStorage.setItem('full_name', data.full_name || '');
          localStorage.setItem('avatar_url', data.avatar_url || '');
        }
      }).catch((err) => {
        console.error("Error fetching latest profile details:", err);
      });
    }
  }, [router.pathname]);

  const handleLogout = () => {
    api.logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: '100vh', backgroundColor: '#09090b', color: '#fff'
      }}>
        Cargando asistente familiar...
      </div>
    );
  }

  const navItems = [
    { name: 'Inicio', path: '/', icon: <Home size={20} /> },
    { name: 'Accesos Directos', path: '/shortcuts', icon: <Link2 size={20} /> },
    { name: 'Notas Multimedia', path: '/notes', icon: <FileText size={20} /> },
    { name: 'Calendario Familiar', path: '/calendar', icon: <Calendar size={20} /> },
    { name: 'Chat Familiar', path: '/chat', icon: <MessageSquare size={20} /> },
    { name: 'YouTube a Doc', path: '/transcriber', icon: <Sparkles size={20} /> },
    { name: 'Asistente de IA', path: '/ai-assistant', icon: <Cat size={20} /> },
  ];

  // If user is Admin, add Admin panel navigation
  if (role === 'admin') {
    navItems.push({ name: 'Familia (Admin)', path: '/admin', icon: <Users size={20} /> });
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header" style={{ marginBottom: '20px' }}>
          <h2 className="sidebar-logo">⚡ Asistente</h2>
          <div className="sidebar-subtitle">Organizador familiar</div>
        </div>

        {/* User Session Profile & Logout */}
        <div style={{ 
          backgroundColor: '#f8fafc',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '12px 15px', 
          marginBottom: '25px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '10px' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Avatar" 
                style={{ 
                  width: '38px', 
                  height: '38px', 
                  borderRadius: '50%', 
                  objectFit: 'cover',
                  border: '1.5px solid var(--accent-color)'
                }} 
              />
            ) : (
              <div style={{ 
                width: '38px', 
                height: '38px', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, var(--accent-color) 0%, #c084fc 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '0.85rem'
              }}>
                {(fullName || username || '?').substring(0, 2).toUpperCase()}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{ 
                fontWeight: '700', 
                color: 'var(--text-primary)', 
                fontSize: '0.85rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }} title={fullName || username}>
                {fullName || username}
              </span>
              <span style={{ 
                fontSize: '0.65rem', 
                color: 'var(--text-muted)', 
                textTransform: 'uppercase', 
                marginTop: '1px' 
              }}>{role === 'admin' ? 'Administrador' : 'Familiar'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', width: '100%', marginTop: '4px' }}>
            <Link 
              href="/profile" 
              className="btn btn-secondary" 
              style={{ 
                flex: 1,
                justifyContent: 'center', 
                padding: '5px 8px',
                fontSize: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: '#fff',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              Perfil
            </Link>

            <button 
              onClick={handleLogout} 
              className="btn btn-secondary" 
              style={{ 
                justifyContent: 'center', 
                border: '1px solid rgba(239, 68, 68, 0.2)', 
                backgroundColor: 'rgba(239, 68, 68, 0.02)',
                color: '#ef4444',
                padding: '5px 8px',
                fontSize: '0.75rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Cerrar Sesión"
            >
              <LogOut size={12} />
            </button>
          </div>
        </div>

        <nav className="sidebar-nav" style={{ flexGrow: 1 }}>
          {navItems.map((item) => {
            const isActive = router.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                href={item.path} 
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          v2.0.0 © 2026
        </div>
      </aside>

      {/* Page Content */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
