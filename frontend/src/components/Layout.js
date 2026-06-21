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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    } else {
      setUsername(localStorage.getItem('username') || '');
      setRole(localStorage.getItem('role') || '');
      setLoading(false);
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
    { name: 'Inicio', path: '/dashboard', icon: <Home size={20} /> },
    { name: 'Accesos Directos', path: '/', icon: <Link2 size={20} /> },
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

        {/* User Session Profile & Logout (Placed at top for easy access) */}
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
          <div style={{ fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Sesión:</span>{' '}
            <strong style={{ color: 'var(--accent-color)' }}>{username}</strong>
            <span style={{ 
              display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', 
              textTransform: 'uppercase', marginTop: '2px' 
            }}>{role}</span>
          </div>

          <button 
            onClick={handleLogout} 
            className="btn btn-secondary" 
            style={{ 
              width: '100%', 
              justifyContent: 'center', 
              border: '1px solid rgba(239, 68, 68, 0.2)', 
              color: '#ef4444',
              padding: '6px 12px',
              fontSize: '0.8rem',
              borderRadius: '8px',
              gap: '6px'
            }}
          >
            <LogOut size={14} />
            <span>Cerrar Sesión</span>
          </button>
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
