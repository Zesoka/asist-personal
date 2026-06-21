import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { api } from '../utils/api';
import { Calendar as CalendarIcon, Clock, MapPin, Plus, Trash2 } from 'lucide-react';

export default function FamilyCalendar() {
  const [familyEvents, setFamilyEvents] = useState([]);
  const [googleEvents, setGoogleEvents] = useState([]);
  const [userId, setUserId] = useState(null);
  const [role, setRole] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchEvents();
      api.getMe()
        .then(profile => setUserId(profile.id))
        .catch(err => console.error(err));
    }
    setRole(localStorage.getItem('role') || '');
  }, []);

  const fetchEvents = async () => {
    try {
      const famData = await api.listFamilyEvents();
      if (Array.isArray(famData)) {
        setFamilyEvents(famData);
      }
      
      const gData = await api.getGoogleEvents();
      if (Array.isArray(gData)) {
        setGoogleEvents(gData);
      }
    } catch (err) {
      console.error('Error fetching calendar events:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!title) {
      setMessage('El título es obligatorio');
      return;
    }

    // Compose ISO timestamp using today's date
    const today = new Date().toISOString().split('T')[0];
    const fullStart = `${today}T${startTime}:00`;
    const fullEnd = `${today}T${endTime}:00`;

    if (new Date(fullStart) > new Date(fullEnd)) {
      setMessage('La hora de inicio debe ser antes de la hora de fin');
      return;
    }

    try {
      await api.createFamilyEvent({
        title,
        description,
        start_time: fullStart,
        end_time: fullEnd,
        location
      });
      
      // Reset form
      setTitle('');
      setDescription('');
      setStartTime('09:00');
      setEndTime('10:00');
      setLocation('');
      setShowAddForm(false);
      
      // Refresh list
      fetchEvents();
    } catch (err) {
      setMessage(err.message || 'Error al guardar el evento');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('¿Estás seguro de que quieres eliminar este evento?')) {
      try {
        await api.deleteFamilyEvent(id);
        fetchEvents();
      } catch (err) {
        console.error('Error deleting event:', err);
      }
    }
  };

  const formatTime = (isoString) => {
    try {
      const dt = new Date(isoString);
      return dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <Layout>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 className="page-title">📅 Agenda Diaria</h1>
          <p className="page-description">Sincroniza y visualiza los compromisos y horarios de toda la familia.</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus size={18} />
          <span>{showAddForm ? 'Cerrar Formulario' : 'Planificar Horario'}</span>
        </button>
      </div>

      {showAddForm && (
        <div className="glass-panel" style={{ marginBottom: '30px', maxWidth: '600px' }}>
          <h3 style={{ marginBottom: '20px' }}>⏰ Agendar Evento para Hoy</h3>
          
          {message && (
            <div style={{ color: '#ef4444', marginBottom: '15px', fontSize: '0.9rem' }}>{message}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">¿Qué vas a hacer? (Título) *</label>
              <input 
                type="text" 
                className="form-input" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="Ej. Dentista, Gimnasio, Clases"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Descripción</label>
              <input 
                type="text" 
                className="form-input" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Ej. Control de brackets"
              />
            </div>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">Hora Inicio *</label>
                <input 
                  type="time" 
                  className="form-input" 
                  value={startTime} 
                  onChange={(e) => setStartTime(e.target.value)} 
                  required
                />
              </div>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">Hora Fin *</label>
                <input 
                  type="time" 
                  className="form-input" 
                  value={endTime} 
                  onChange={(e) => setEndTime(e.target.value)} 
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Lugar / Ubicación</label>
              <input 
                type="text" 
                className="form-input" 
                value={location} 
                onChange={(e) => setLocation(e.target.value)} 
                placeholder="Ej. Consultorio Médico"
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Agendar en la Línea Familiar
            </button>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '40px' }}>
        
        {/* Family shared agenda timeline */}
        <div>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            👥 ¿Dónde está cada uno hoy?
          </h3>
          
          {!Array.isArray(familyEvents) || familyEvents.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text-secondary)' }}>Nadie ha agendado actividades para hoy todavía.</p>
            </div>
          ) : (
            <div className="timeline">
              {Array.isArray(familyEvents) && familyEvents.map((ev) => {
                const canDelete = role === 'admin' || ev.user_id === userId;
                return (
                  <div key={ev.id} className="timeline-item">
                    <div className="timeline-info">
                      <div className="timeline-user">👤 {ev.username}</div>
                      <div className="timeline-title">{ev.title}</div>
                      {ev.description && <div className="timeline-desc">{ev.description}</div>}
                      {ev.location && (
                        <div className="timeline-loc">
                          <MapPin size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                          <span>{ev.location}</span>
                        </div>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '15px' }}>
                      <div className="timeline-time">
                        <Clock size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                        <span>{formatTime(ev.start_time)} - {formatTime(ev.end_time)}</span>
                      </div>
                      
                      {canDelete && (
                        <button 
                          className="btn" 
                          onClick={() => handleDelete(ev.id)}
                          style={{ padding: '4px', color: 'var(--text-muted)', backgroundColor: 'transparent' }}
                          title="Eliminar evento"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Google Calendar sync feed */}
        <div>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            📅 Agenda Google Calendar (Sincronizado)
          </h3>
          
          {!Array.isArray(googleEvents) || googleEvents.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text-secondary)' }}>No hay eventos de Google Calendar para hoy.</p>
            </div>
          ) : (
            <div className="timeline">
              {Array.isArray(googleEvents) && googleEvents.map((ev, idx) => (
                <div key={idx} className="timeline-item" style={{ borderLeftColor: '#10b981' }}>
                  <div className="timeline-info">
                    <div className="timeline-title">{ev.summary}</div>
                    {ev.description && <div className="timeline-desc">{ev.description}</div>}
                    {ev.location && (
                      <div className="timeline-loc">
                        <MapPin size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                        <span>{ev.location}</span>
                      </div>
                    )}
                  </div>
                  <div className="timeline-time" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                    <Clock size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    <span>{formatTime(ev.start)} - {formatTime(ev.end)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
