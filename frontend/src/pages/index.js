import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { api } from '../utils/api';
import { CloudSun, TrendingUp, Newspaper, Trophy, Compass, Clock } from 'lucide-react';

export default function DashboardHome() {
  const [displayName, setDisplayName] = useState('');
  
  // Weather States
  const [weather, setWeather] = useState(null);
  const [city, setCity] = useState('Buenos Aires, AR');
  const [weatherLoading, setWeatherLoading] = useState(true);

  // Dollar States
  const [dolar, setDolar] = useState([]);
  const [dolarLoading, setDolarLoading] = useState(true);

  // News States
  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const storedFullName = localStorage.getItem('full_name');
      const storedUsername = localStorage.getItem('username');
      setDisplayName(storedFullName || storedUsername || 'Familiar');
      
      api.getMe().then((data) => {
        setDisplayName(data.full_name || data.username || 'Familiar');
      }).catch((err) => {
        console.error('Error syncing welcome display name:', err);
      });

      loadWeatherAndLocation();
      fetchDolarRates();
      fetchNews();
    }
  }, []);

  // Weather & Location loading
  const loadWeatherAndLocation = () => {
    // Default fallback coordinates (Buenos Aires)
    let lat = -34.6037;
    let lon = -58.3816;
    setCity('Buenos Aires, AR');

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          lat = position.coords.latitude;
          lon = position.coords.longitude;
          
          // Try to reverse geocode the city name
          try {
            const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=es`);
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              const cityName = geoData.city || geoData.locality || geoData.principalSubdivision || 'Tu ubicación';
              const countryCode = geoData.countryCode || 'AR';
              setCity(`${cityName}, ${countryCode}`);
            }
          } catch (err) {
            console.error('Error in reverse geocoding:', err);
            setCity('Ubicación local');
          }
          
          fetchWeather(lat, lon);
        },
        (error) => {
          console.warn('Geolocation denied or failed. Using fallback (Buenos Aires):', error);
          fetchWeather(lat, lon);
        }
      );
    } else {
      fetchWeather(lat, lon);
    }
  };

  // Weather API call
  const fetchWeather = async (lat, lon) => {
    try {
      setWeatherLoading(true);
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`);
      if (res.ok) {
        const data = await res.json();
        setWeather(data);
      }
    } catch (err) {
      console.error('Error fetching weather:', err);
    } finally {
      setWeatherLoading(false);
    }
  };

  // Dollar API call
  const fetchDolarRates = async () => {
    try {
      setDolarLoading(true);
      const res = await fetch('https://dolarapi.com/v1/dolares');
      if (res.ok) {
        const data = await res.json();
        // We only care about Oficial and Blue for a clean card
        const filtered = data.filter(d => d.casa === 'oficial' || d.casa === 'blue');
        setDolar(filtered);
      }
    } catch (err) {
      console.error('Error fetching dollar:', err);
    } finally {
      setDolarLoading(false);
    }
  };

  // News API call
  const fetchNews = async () => {
    try {
      setNewsLoading(true);
      const data = await api.getDashboardNews();
      if (Array.isArray(data)) {
        setNews(data);
      }
    } catch (err) {
      console.error('Error fetching news:', err);
    } finally {
      setNewsLoading(false);
    }
  };

  // Weather description converter
  const getWeatherDesc = (code) => {
    const codes = {
      0: { label: 'Despejado', icon: '☀️' },
      1: { label: 'Mayormente despejado', icon: '🌤️' },
      2: { label: 'Parcialmente nublado', icon: '⛅' },
      3: { label: 'Nublado', icon: '☁️' },
      45: { label: 'Niebla', icon: '🌫️' },
      48: { label: 'Niebla de escarcha', icon: '🌫️' },
      51: { label: 'Llovizna ligera', icon: '🌧️' },
      53: { label: 'Llovizna moderada', icon: '🌧️' },
      55: { label: 'Llovizna densa', icon: '🌧️' },
      61: { label: 'Lluvia débil', icon: '🌧️' },
      63: { label: 'Lluvia moderada', icon: '🌧️' },
      65: { label: 'Lluvia fuerte', icon: '🌧️' },
      80: { label: 'Chaparrones débiles', icon: '🌦️' },
      81: { label: 'Chaparrones moderados', icon: '🌦️' },
      82: { label: 'Chaparrones violentos', icon: '⛈️' },
      95: { label: 'Tormenta eléctrica', icon: '⛈️' },
    };
    return codes[code] || { label: 'Templado', icon: '🌡️' };
  };

  // Format Date for header
  const getFormattedDate = () => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const d = new Date();
    return `${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
  };

  // World Cup recent match results (Actual tournament context as of June 2026)
  const wcResults = [
    { date: '22 Jun 2026 (Mañana)', teams: '🇦🇷 Argentina vs. 🇦🇹 Austria', stage: 'Grupo J (Fase de Grupos)', status: 'Próximo - 22:00' },
    { date: '16 Jun 2026', teams: '🇦🇷 Argentina 3 - 0 🇩🇿 Argelia', stage: 'Grupo J (Fase de Grupos)', status: 'Finalizado' },
    { date: '12 Jun 2026', teams: '🇺🇸 EE.UU. 4 - 1 🇵🇾 Paraguay', stage: 'Grupo D (Fase de Grupos)', status: 'Finalizado' },
    { date: '12 Jun 2026', teams: '🇨🇦 Canadá 1 - 1 🇧🇦 Bosnia y H.', stage: 'Grupo B (Fase de Grupos)', status: 'Finalizado' },
    { date: '11 Jun 2026', teams: '🇲🇽 México 2 - 0 🇿🇦 Sudáfrica', stage: 'Grupo A (Partido Inaugural)', status: 'Finalizado' },
    { date: '27 Jun 2026', teams: '🇯🇴 Jordania vs. 🇦🇷 Argentina', stage: 'Grupo J (Fase de Grupos)', status: 'Próximamente' }
  ];

  return (
    <Layout>
      {/* Welcome Header */}
      <div className="page-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', marginBottom: '30px' }}>
        <h1 className="page-title" style={{ fontSize: '2.5rem', fontWeight: '800' }}>
          Bienvenido {displayName} 👋
        </h1>
        <p className="page-description" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginTop: '5px' }}>
          <Clock size={16} /> <span>{getFormattedDate()}</span>
          <span style={{ color: 'var(--text-muted)' }}>•</span>
          <Compass size={16} /> <span>{city}</span>
        </p>
      </div>

      {/* Main Grid: Left Column (Wider: 1.62fr) & Right Column (1fr) */}
      <div className="dashboard-grid">
        
        {/* LEFT COLUMN: Weather & News (Wider) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Weather Widget */}
          <div className="glass-panel" style={{ position: 'relative' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: 'var(--text-primary)' }}>
              <CloudSun size={20} style={{ color: '#4f46e5' }} /> Pronóstico del Clima
            </h2>
            {weatherLoading ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Cargando reporte de clima...</div>
            ) : weather ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div>
                    <div style={{ fontSize: '3.5rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: '1' }}>
                      {Math.round(weather.current.temperature_2m)}°C
                    </div>
                    <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: '600', marginTop: '5px' }}>
                      {getWeatherDesc(weather.current.weather_code).icon} {getWeatherDesc(weather.current.weather_code).label}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>Sensación: <strong>{Math.round(weather.current.apparent_temperature)}°C</strong></div>
                    <div>Humedad: <strong>{weather.current.relative_humidity_2m}%</strong></div>
                    <div>Viento: <strong>{Math.round(weather.current.wind_speed_10m)} km/h</strong></div>
                  </div>
                </div>

                {/* 3 Day Forecast */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '5px' }}>Próximos Días</div>
                  {weather.daily.time.slice(1, 4).map((day, idx) => {
                    const dayDate = new Date(day + 'T00:00:00');
                    const dayName = dayDate.toLocaleDateString('es-ES', { weekday: 'short' });
                    const code = weather.daily.weather_code[idx + 1];
                    const maxTemp = Math.round(weather.daily.temperature_2m_max[idx + 1]);
                    const minTemp = Math.round(weather.daily.temperature_2m_min[idx + 1]);
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ textTransform: 'capitalize', width: '70px', fontWeight: '500' }}>{dayName}</span>
                        <span style={{ fontSize: '1.1rem' }} title={getWeatherDesc(code).label}>{getWeatherDesc(code).icon}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          <strong>{maxTemp}°</strong> / <span style={{ color: 'var(--text-muted)' }}>{minTemp}°</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--error-color)', fontSize: '0.9rem' }}>Error al obtener datos meteorológicos.</div>
            )}
          </div>

          {/* News Feed Widget (Wider) */}
          <div className="glass-panel">
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: 'var(--text-primary)' }}>
              <Newspaper size={20} style={{ color: '#ef4444' }} /> Principales Noticias
            </h2>
            {newsLoading ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Buscando últimas novedades...</div>
            ) : news.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '550px', overflowY: 'auto', paddingRight: '5px' }}>
                {news.map((item, idx) => (
                  <div key={idx} style={{ 
                    borderBottom: idx < news.length - 1 ? '1px solid var(--border-color)' : 'none', 
                    paddingBottom: idx < news.length - 1 ? '12px' : '0' 
                  }}>
                    <a 
                      href={item.link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ 
                        textDecoration: 'none', 
                        color: 'var(--text-primary)', 
                        fontWeight: '600', 
                        fontSize: '1rem',
                        lineHeight: '1.45',
                        display: 'block'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-color)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                    >
                      {item.title}
                    </a>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                      <span style={{ backgroundColor: '#f1f5f9', padding: '3px 10px', borderRadius: '4px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                        {item.source}
                      </span>
                      <span>{item.pub_date}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No hay noticias disponibles en este momento.</div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Dollar Rates & World Cup Results (Narrower: 1fr) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Dollar Rates Widget */}
          <div className="glass-panel">
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: 'var(--text-primary)' }}>
              <TrendingUp size={20} style={{ color: '#10b981' }} /> Cotización del Dólar
            </h2>
            {dolarLoading ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Cargando cotizaciones...</div>
            ) : dolar.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                {dolar.map((d, idx) => (
                  <div key={idx} style={{ 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '12px', 
                    padding: '12px', 
                    textAlign: 'center',
                    backgroundColor: d.casa === 'blue' ? 'rgba(16, 185, 129, 0.03)' : 'transparent',
                    borderColor: d.casa === 'blue' ? 'rgba(16, 185, 129, 0.2)' : 'var(--border-color)'
                  }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: d.casa === 'blue' ? '#047857' : 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Dólar {d.nombre}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Compra</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)' }}>${d.compra}</div>
                      <div style={{ width: '100%', height: '1px', backgroundColor: 'var(--border-color)', margin: '3px 0' }} />
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Venta</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)' }}>${d.venta}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--error-color)', fontSize: '0.9rem' }}>No se pudo obtener la cotización del dólar.</div>
            )}
            <div style={{ textAlign: 'right', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '10px' }}>Fuente: DolarAPI.com</div>
          </div>

          {/* Sports Widget: World Cup 2026 Results (Narrower Column, under Dolar) */}
          <div className="glass-panel">
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', color: 'var(--text-primary)' }}>
              <Trophy size={20} style={{ color: '#eab308' }} /> Resultados Mundial 2026
            </h2>
            
            {/* Recent Match Results list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Últimos Partidos Jugados</div>
              {wcResults.map((r, idx) => (
                <div key={idx} style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '3px',
                  padding: '10px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  backgroundColor: r.teams.includes('Argentina') ? 'rgba(99, 102, 241, 0.03)' : 'transparent',
                  borderLeft: r.teams.includes('Argentina') ? '3px solid var(--accent-color)' : '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>{r.date}</span>
                    <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: '700' }}>{r.status}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)', margin: '2px 0' }}>{r.teams}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.stage}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </Layout>
  );
}
