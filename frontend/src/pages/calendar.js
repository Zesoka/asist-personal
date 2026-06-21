import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { api } from '../utils/api';
import { Calendar as CalendarIcon, Clock, MapPin, Plus, Trash2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

export default function FamilyCalendar() {
  const [familyEvents, setFamilyEvents] = useState([]);
  const [googleEvents, setGoogleEvents] = useState([]);
  const [userId, setUserId] = useState(null);
  const [role, setRole] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Calendar Navigation & Views
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // 'month' | 'week' | 'day'

  // Google Calendar Integration states
  const [googleStatus, setGoogleStatus] = useState('loading'); // 'loading', 'no_credentials', 'auth_required', 'connected'
  const [googleMessage, setGoogleMessage] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');

  // Form states (For adding local family events)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState(''); // YYYY-MM-DD
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.getMe()
        .then(profile => setUserId(profile.id))
        .catch(err => console.error(err));
    }
    setRole(localStorage.getItem('role') || '');

    // Set today as default date for scheduler
    const todayStr = new Date().toISOString().split('T')[0];
    setEventDate(todayStr);

    // Check URL parameters for OAuth status
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    if (status === 'success') {
      alert('¡Sincronización con Google Calendar exitosa!');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (status === 'error') {
      const msg = params.get('message') || 'Error desconocido';
      alert(`Error al conectar Google Calendar: ${msg}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Compute active range and fetch events on state changes
  useEffect(() => {
    fetchEventsForActiveRange();
  }, [currentDate, view, userId]);

  // Helper to convert Date object to local YYYY-MM-DD string
  const formatDateToLocalString = (date) => {
    const tzoffset = date.getTimezoneOffset() * 60000;
    return (new Date(date - tzoffset)).toISOString().split('T')[0];
  };

  const getRangeDates = (date, activeView) => {
    const d = new Date(date);
    let start, end;
    if (activeView === 'month') {
      const y = d.getFullYear();
      const m = d.getMonth();
      start = new Date(y, m, 1, 0, 0, 0);
      // Last day of month
      end = new Date(y, m + 1, 0, 23, 59, 59);
    } else if (activeView === 'week') {
      const day = d.getDay();
      const diff = d.getDate() - day;
      start = new Date(d.setDate(diff));
      start.setHours(0, 0, 0, 0);
      
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else {
      start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    }

    const toLocalISOString = (dt) => {
      const tzoffset = dt.getTimezoneOffset() * 60000;
      return (new Date(dt - tzoffset)).toISOString().slice(0, -1);
    };

    return {
      start: toLocalISOString(start),
      end: toLocalISOString(end)
    };
  };

  const fetchEventsForActiveRange = async () => {
    const { start, end } = getRangeDates(currentDate, view);
    try {
      // 1. Fetch SQLite family events
      const famData = await api.listFamilyEvents(start, end);
      if (Array.isArray(famData)) {
        setFamilyEvents(famData);
      }

      // 2. Fetch user-specific Google Calendar events
      setGoogleStatus('loading');
      const gData = await api.getGoogleEvents(start, end);
      if (gData && gData.status) {
        setGoogleStatus(gData.status);
        if (gData.status === 'connected' && Array.isArray(gData.events)) {
          setGoogleEvents(gData.events);
        } else {
          setGoogleEvents([]);
          if (gData.message) {
            setGoogleMessage(gData.message);
          }
        }
      } else if (Array.isArray(gData)) {
        setGoogleStatus('connected');
        setGoogleEvents(gData);
      }
    } catch (err) {
      console.error('Error loading events:', err);
      setGoogleStatus('auth_required');
      setGoogleMessage('Error al sincronizar con el servidor.');
    }
  };

  const handlePrev = () => {
    const d = new Date(currentDate);
    if (view === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else if (view === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setDate(d.getDate() - 1);
    }
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (view === 'month') {
      d.setMonth(d.getMonth() + 1);
    } else if (view === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setDate(d.getDate() + 1);
    }
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!title || !eventDate) {
      setMessage('El título y la fecha son obligatorios');
      return;
    }

    const fullStart = `${eventDate}T${startTime}:00`;
    const fullEnd = `${eventDate}T${endTime}:00`;

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
      
      setTitle('');
      setDescription('');
      setStartTime('09:00');
      setEndTime('10:00');
      setLocation('');
      setShowAddForm(false);
      
      fetchEventsForActiveRange();
    } catch (err) {
      setMessage(err.message || 'Error al guardar el evento');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('¿Estás seguro de que quieres eliminar este evento?')) {
      try {
        await api.deleteFamilyEvent(id);
        fetchEventsForActiveRange();
      } catch (err) {
        console.error('Error deleting event:', err);
      }
    }
  };

  const handleUploadCredentials = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadStatus('Por favor selecciona un archivo');
      return;
    }
    
    const formData = new FormData();
    formData.append('file', uploadFile);
    
    try {
      setUploadStatus('Subiendo credenciales...');
      await api.uploadGoogleCredentials(formData);
      setUploadStatus('¡Credenciales subidas con éxito!');
      setUploadFile(null);
      fetchEventsForActiveRange();
    } catch (err) {
      setUploadStatus(`Error: ${err.message}`);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const data = await api.getGoogleAuthUrl();
      if (data.auth_url) {
        window.location.href = data.auth_url;
      }
    } catch (err) {
      alert(`Error al iniciar la sincronización: ${err.message}`);
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

  // UI Date calculations for display
  const getHeaderLabel = () => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    if (view === 'month') {
      return `${months[currentDate.getMonth()]} de ${currentDate.getFullYear()}`;
    } else if (view === 'week') {
      const { start, end } = getRangeDates(currentDate, 'week');
      const startDt = new Date(start);
      const endDt = new Date(end);
      return `Semana del ${startDt.getDate()} al ${endDt.getDate()} de ${months[startDt.getMonth()]} (${startDt.getFullYear()})`;
    } else {
      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      return `${days[currentDate.getDay()]} ${currentDate.getDate()} de ${months[currentDate.getMonth()]}, ${currentDate.getFullYear()}`;
    }
  };

  // Helper: Month Grid builder
  const getMonthDays = () => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const firstDayIndex = new Date(y, m, 1).getDay(); // Sunday=0, Monday=1, etc.
    const totalDays = new Date(y, m + 1, 0).getDate(); // Total days in month
    
    const cells = [];
    // Padding for previous month days
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ dayNum: null, key: `empty-${i}` });
    }
    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      cells.push({ dayNum: i, key: `day-${i}` });
    }
    return cells;
  };

  const getEventsForDayNum = (dayNum) => {
    if (!dayNum) return { fam: [], google: [] };
    const dateStr = formatDateToLocalString(new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum));
    
    const fam = familyEvents.filter(ev => ev.start_time.split('T')[0] === dateStr);
    const google = googleEvents.filter(ev => ev.start.split('T')[0] === dateStr);
    return { fam, google };
  };

  // Helper: Week days builder
  const getWeekDays = () => {
    const { start } = getRangeDates(currentDate, 'week');
    const startDt = new Date(start);
    const days = [];
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    
    for (let i = 0; i < 7; i++) {
      const current = new Date(startDt);
      current.setDate(startDt.getDate() + i);
      const dateStr = formatDateToLocalString(current);
      
      const fam = familyEvents.filter(ev => ev.start_time.split('T')[0] === dateStr);
      const google = googleEvents.filter(ev => ev.start.split('T')[0] === dateStr);
      
      days.push({
        name: dayNames[current.getDay()],
        dateNum: current.getDate(),
        dateObj: current,
        fam,
        google
      });
    }
    return days;
  };

  const getCombinedDayEvents = () => {
    const activeStr = formatDateToLocalString(currentDate);
    const fam = familyEvents.filter(ev => ev.start_time.split('T')[0] === activeStr).map(ev => ({ ...ev, type: 'family' }));
    const google = googleEvents.filter(ev => ev.start.split('T')[0] === activeStr).map(ev => ({ ...ev, type: 'google' }));
    
    // Sort all events by start time
    return [...fam, ...google].sort((a, b) => {
      const aTime = a.type === 'family' ? a.start_time : a.start;
      const bTime = b.type === 'family' ? b.start_time : b.start;
      return aTime.localeCompare(bTime);
    });
  };

  const handleDayZoom = (dayNum) => {
    if (!dayNum) return;
    const targetedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
    setCurrentDate(targetedDate);
    setView('day');
  };

  const handleOpenFormForDate = (dateObj) => {
    setEventDate(formatDateToLocalString(dateObj));
    setShowAddForm(true);
  };

  return (
    <Layout>
      {/* Top Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            📅 Agenda Familiar
          </h1>
          <p className="page-description">Visualiza y planifica los compromisos diarios, semanales y mensuales de toda la casa.</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => {
            setEventDate(formatDateToLocalString(currentDate));
            setShowAddForm(!showAddForm);
          }}
        >
          <Plus size={18} />
          <span>{showAddForm ? 'Cerrar Programador' : 'Planificar Horario'}</span>
        </button>
      </div>

      {/* Pop-up Add Event Form */}
      {showAddForm && (
        <div className="glass-panel" style={{ marginBottom: '30px', maxWidth: '600px', borderLeft: '4px solid var(--accent-color)' }}>
          <h3 style={{ marginBottom: '15px', fontWeight: '700' }}>⏰ Programar Evento</h3>
          
          {message && (
            <div style={{ color: '#ef4444', marginBottom: '15px', fontSize: '0.9rem' }}>{message}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">¿Qué actividad planificas? *</label>
              <input 
                type="text" 
                className="form-input" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="Ej. Dentista, Gimnasio, Clases de Piano"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Descripción o Notas</label>
              <input 
                type="text" 
                className="form-input" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Ej. Llevar cepillo y placa de descanso"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '20px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Fecha *</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={eventDate} 
                  onChange={(e) => setEventDate(e.target.value)} 
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Hora Inicio *</label>
                <input 
                  type="time" 
                  className="form-input" 
                  value={startTime} 
                  onChange={(e) => setStartTime(e.target.value)} 
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
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
                placeholder="Ej. Consultorio Dr. Pérez"
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Agendar Actividad Familiar
            </button>
          </form>
        </div>
      )}

      {/* Calendar Controls & Navigation Bar */}
      <div className="glass-panel" style={{ padding: '15px 20px', marginBottom: '35px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        
        {/* Prev / Today / Next navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="btn" onClick={handlePrev} style={{ padding: '8px 12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Anterior">
            <ChevronLeft size={16} />
          </button>
          <button className="btn" onClick={handleToday} style={{ padding: '8px 15px', border: '1px solid var(--border-color)', fontWeight: '600', fontSize: '0.9rem' }}>
            Hoy
          </button>
          <button className="btn" onClick={handleNext} style={{ padding: '8px 12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Siguiente">
            <ChevronRight size={16} />
          </button>
          
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginLeft: '10px', color: 'var(--text-primary)' }}>
            {getHeaderLabel()}
          </h2>
        </div>

        {/* View Tabs Selector */}
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '4px', border: '1px solid #e2e8f0' }}>
          <button 
            className="btn" 
            onClick={() => setView('month')}
            style={{ 
              padding: '6px 16px', 
              fontSize: '0.85rem', 
              fontWeight: '600', 
              backgroundColor: view === 'month' ? '#ffffff' : 'transparent', 
              color: view === 'month' ? 'var(--accent-color)' : 'var(--text-secondary)',
              boxShadow: view === 'month' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              borderRadius: '6px'
            }}
          >
            Mes
          </button>
          <button 
            className="btn" 
            onClick={() => setView('week')}
            style={{ 
              padding: '6px 16px', 
              fontSize: '0.85rem', 
              fontWeight: '600', 
              backgroundColor: view === 'week' ? '#ffffff' : 'transparent', 
              color: view === 'week' ? 'var(--accent-color)' : 'var(--text-secondary)',
              boxShadow: view === 'week' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              borderRadius: '6px'
            }}
          >
            Semana
          </button>
          <button 
            className="btn" 
            onClick={() => setView('day')}
            style={{ 
              padding: '6px 16px', 
              fontSize: '0.85rem', 
              fontWeight: '600', 
              backgroundColor: view === 'day' ? '#ffffff' : 'transparent', 
              color: view === 'day' ? 'var(--accent-color)' : 'var(--text-secondary)',
              boxShadow: view === 'day' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              borderRadius: '6px'
            }}
          >
            Día
          </button>
        </div>
      </div>

      {/* Main Calendar View Rendering Container */}
      <div style={{ marginBottom: '40px' }}>
        
        {/* 1. MONTH VIEW */}
        {view === 'month' && (
          <div className="glass-panel" style={{ padding: '20px' }}>
            {/* Days of week header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              <div>Dom</div>
              <div>Lun</div>
              <div>Mar</div>
              <div>Mié</div>
              <div>Jue</div>
              <div>Vie</div>
              <div>Sáb</div>
            </div>
            
            {/* Month grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
              {getMonthDays().map((cell, index) => {
                const { fam, google } = getEventsForDayNum(cell.dayNum);
                const hasEvents = fam.length > 0 || google.length > 0;
                
                // Highlight current day if matching
                const isToday = cell.dayNum && 
                  formatDateToLocalString(new Date()) === formatDateToLocalString(new Date(currentDate.getFullYear(), currentDate.getMonth(), cell.dayNum));

                return (
                  <div 
                    key={cell.key}
                    onClick={() => cell.dayNum && handleDayZoom(cell.dayNum)}
                    style={{
                      minHeight: '90px',
                      padding: '8px',
                      borderRadius: '8px',
                      backgroundColor: cell.dayNum ? (isToday ? '#eff6ff' : '#ffffff') : '#f8fafc',
                      border: cell.dayNum ? (isToday ? '2px solid #3b82f6' : '1px solid #e2e8f0') : '1px dashed #f1f5f9',
                      cursor: cell.dayNum ? 'pointer' : 'default',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                    className={cell.dayNum ? "month-cell" : ""}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ 
                        fontWeight: cell.dayNum ? '700' : '400', 
                        fontSize: '0.95rem',
                        color: cell.dayNum ? (isToday ? '#1d4ed8' : 'var(--text-primary)') : '#cbd5e1'
                      }}>
                        {cell.dayNum}
                      </span>
                      {isToday && (
                        <span style={{ fontSize: '0.7rem', background: '#3b82f6', color: '#ffffff', padding: '1px 5px', borderRadius: '4px', fontWeight: '700' }}>HOY</span>
                      )}
                    </div>

                    {/* Events indicators inside month day cell */}
                    {hasEvents && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '10px' }}>
                        {fam.slice(0, 2).map(ev => (
                          <div key={ev.id} style={{ fontSize: '0.75rem', background: '#e0e7ff', color: '#3730a3', padding: '2px 6px', borderRadius: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '600' }} title={ev.title}>
                            👥 {ev.title}
                          </div>
                        ))}
                        {fam.length > 2 && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600', paddingLeft: '5px' }}>
                            + {fam.length - 2} más
                          </div>
                        )}

                        {google.slice(0, 2).map((ev, idx) => (
                          <div key={idx} style={{ fontSize: '0.75rem', background: '#d1fae5', color: '#065f46', padding: '2px 6px', borderRadius: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '600' }} title={ev.summary}>
                            📅 {ev.summary}
                          </div>
                        ))}
                        {google.length > 2 && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600', paddingLeft: '5px' }}>
                            + {google.length - 2} más
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. WEEK VIEW */}
        {view === 'week' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            {getWeekDays().map((day, idx) => {
              const isToday = formatDateToLocalString(new Date()) === formatDateToLocalString(day.dateObj);
              return (
                <div 
                  key={idx} 
                  className="glass-panel" 
                  style={{ 
                    padding: '20px', 
                    borderTop: isToday ? '4px solid #3b82f6' : '4px solid var(--border-color)',
                    backgroundColor: isToday ? '#fcfdff' : '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '300px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <div>
                        <h4 style={{ fontWeight: '700', color: isToday ? '#1d4ed8' : 'var(--text-primary)' }}>{day.name}</h4>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Día {day.dateNum}</span>
                      </div>
                      
                      <button 
                        className="btn" 
                        onClick={() => handleOpenFormForDate(day.dateObj)}
                        style={{ padding: '4px', backgroundColor: '#f1f5f9', borderRadius: '4px', color: 'var(--text-secondary)' }}
                        title="Programar para este día"
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {/* Family local events */}
                      {day.fam.map(ev => (
                        <div 
                          key={ev.id} 
                          onClick={() => { setCurrentDate(day.dateObj); setView('day'); }}
                          style={{ background: '#e0e7ff', borderLeft: '3px solid #4f46e5', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#3730a3' }}>{ev.title}</div>
                          <div style={{ fontSize: '0.75rem', color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '3px' }}>
                            <Clock size={10} /> <span>{formatTime(ev.start_time)}</span>
                          </div>
                        </div>
                      ))}

                      {/* Google Calendar events */}
                      {day.google.map((ev, gIdx) => (
                        <div 
                          key={gIdx}
                          onClick={() => { setCurrentDate(day.dateObj); setView('day'); }}
                          style={{ background: '#d1fae5', borderLeft: '3px solid #10b981', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#065f46' }}>{ev.summary}</div>
                          <div style={{ fontSize: '0.75rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '3px' }}>
                            <Clock size={10} /> <span>{formatTime(ev.start)}</span>
                          </div>
                        </div>
                      ))}

                      {day.fam.length === 0 && day.google.length === 0 && (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center', marginTop: '30px' }}>Sin citas</p>
                      )}
                    </div>
                  </div>

                  <button 
                    className="btn" 
                    onClick={() => { setCurrentDate(day.dateObj); setView('day'); }}
                    style={{ color: 'var(--accent-color)', fontSize: '0.8rem', fontWeight: '600', width: '100%', textAlign: 'center', marginTop: '20px', padding: '5px 0' }}
                  >
                    Ver detalles
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* 3. DAY VIEW */}
        {view === 'day' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
            
            {/* Timeline display */}
            <div>
              <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                👤 Actividades planificadas para hoy
              </h3>
              
              {getCombinedDayEvents().length === 0 ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '45px' }}>
                  <p style={{ color: 'var(--text-secondary)' }}>No hay eventos registrados para esta fecha.</p>
                  <button 
                    className="btn btn-primary" 
                    style={{ marginTop: '15px' }}
                    onClick={() => {
                      setEventDate(formatDateToLocalString(currentDate));
                      setShowAddForm(true);
                    }}
                  >
                    <Plus size={16} /> <span>Programar la primera cita</span>
                  </button>
                </div>
              ) : (
                <div className="timeline">
                  {getCombinedDayEvents().map((ev, idx) => {
                    const isFamily = ev.type === 'family';
                    const canDelete = isFamily && (role === 'admin' || ev.user_id === userId);
                    const startTimeStr = isFamily ? ev.start_time : ev.start;
                    const endTimeStr = isFamily ? ev.end_time : ev.end;
                    const locationStr = isFamily ? ev.location : ev.location;
                    const descStr = isFamily ? ev.description : ev.description;

                    return (
                      <div 
                        key={idx} 
                        className="timeline-item" 
                        style={{ borderLeftColor: isFamily ? '#4f46e5' : '#10b981' }}
                      >
                        <div className="timeline-info">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ 
                              fontSize: '0.75rem', 
                              padding: '2px 8px', 
                              borderRadius: '12px', 
                              fontWeight: '700', 
                              backgroundColor: isFamily ? '#e0e7ff' : '#d1fae5',
                              color: isFamily ? '#3730a3' : '#065f46'
                            }}>
                              {isFamily ? `👤 Local (${ev.username})` : '📅 Google Calendar'}
                            </span>
                          </div>
                          
                          <div className="timeline-title" style={{ fontSize: '1.1rem', fontWeight: '700' }}>
                            {isFamily ? ev.title : ev.summary}
                          </div>
                          
                          {descStr && <div className="timeline-desc" style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>{descStr}</div>}
                          
                          {locationStr && (
                            <div className="timeline-loc" style={{ marginTop: '8px' }}>
                              <MapPin size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                              <span>{locationStr}</span>
                            </div>
                          )}
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '15px' }}>
                          <div className="timeline-time" style={{ background: isFamily ? 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                            <Clock size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                            <span>{formatTime(startTimeStr)} - {formatTime(endTimeStr)}</span>
                          </div>
                          
                          {canDelete && (
                            <button 
                              className="btn" 
                              onClick={() => handleDelete(ev.id)}
                              style={{ padding: '4px', color: '#ef4444', backgroundColor: 'transparent' }}
                              title="Eliminar evento local"
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
            
          </div>
        )}

      </div>

      {/* Google Calendar Admin upload or User connect settings bar */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '30px', marginTop: '20px' }}>
        <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          ⚙️ Ajustes de Sincronización de Google Calendar
        </h3>
        
        {googleStatus === 'no_credentials' && (
          <div className="glass-panel" style={{ padding: '25px', borderLeft: '4px solid #ef4444' }}>
            <h4 style={{ color: '#ef4444', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🔑 Falta Configuración de Google Calendar
            </h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
              Para poder sincronizar las agendas individuales con Google Calendar, se requiere que un administrador suba el archivo <code>credentials.json</code> obtenido de Google Cloud Console.
            </p>
            {role === 'admin' ? (
              <form onSubmit={handleUploadCredentials} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                <input 
                  type="file" 
                  accept=".json"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="form-input"
                  style={{ maxWidth: '300px', padding: '5px' }}
                  required
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 15px' }}>
                  Subir credenciales
                </button>
                {uploadStatus && (
                  <span style={{ fontSize: '0.85rem', color: uploadStatus.includes('Error') ? '#ef4444' : '#10b981', marginLeft: '10px' }}>
                    {uploadStatus}
                  </span>
                )}
              </form>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Por favor, solicita a un administrador que suba el archivo de credenciales.
              </p>
            )}
          </div>
        )}

        {googleStatus === 'auth_required' && (
          <div className="glass-panel" style={{ padding: '25px', borderLeft: '4px solid #f59e0b' }}>
            <h4 style={{ color: '#f59e0b', marginBottom: '10px' }}>
              🔗 Sincronización Requerida
            </h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
              {googleMessage || 'Para ver tus eventos personales de tu calendario de Google en la agenda familiar, debes conectar tu cuenta.'}
            </p>
            <button onClick={handleConnectGoogle} className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
              Conectar mi Google Calendar
            </button>
          </div>
        )}

        {googleStatus === 'connected' && (
          <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h4 style={{ color: '#065f46', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ✅ Tu Google Calendar está conectado
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Tus eventos personales se están sincronizando correctamente en las vistas de Día, Semana y Mes.
              </p>
            </div>
            <button onClick={handleConnectGoogle} className="btn" style={{ border: '1px solid #10b981', color: '#059669', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 15px', backgroundColor: 'transparent' }}>
              <RefreshCw size={14} /> Re-conectar cuenta
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
