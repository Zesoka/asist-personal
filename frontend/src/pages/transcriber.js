import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { api } from '../utils/api';
import { Youtube, Sparkles, FileText, Download, AlertCircle } from 'lucide-react';

export default function Transcriber() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [provider, setProvider] = useState('gemini');
  const [customKey, setCustomKey] = useState('');
  const [tutorial, setTutorial] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState('');
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    // Cleanup polling interval on component unmount
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const handleProcess = async (e) => {
    e.preventDefault();
    setError('');
    setTutorial('');
    setStatusMessage('Inicializando procesamiento de video...');
    setLoading(true);

    if (!youtubeUrl) {
      setError('Por favor ingresa un enlace de YouTube');
      setLoading(false);
      return;
    }

    // Clean up any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    try {
      const initRes = await api.processVideo(youtubeUrl, provider, customKey || null);
      const taskId = initRes.task_id;

      // Start status polling
      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusRes = await api.getTranscriberStatus(taskId);
          
          if (statusRes.status === 'completed') {
            setTutorial(statusRes.tutorial);
            setLoading(false);
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          } else if (statusRes.status === 'failed') {
            setError(statusRes.error || 'Error al procesar el video');
            setLoading(false);
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          } else {
            // pending or processing
            setStatusMessage(statusRes.message || 'Procesando...');
          }
        } catch (err) {
          setError(err.message || 'Error al consultar el progreso de la tarea');
          setLoading(false);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      }, 3000);

    } catch (err) {
      setError(err.message || 'Error al procesar el video. Revisa la URL.');
      setLoading(false);
    }
  };

  const handleDownload = async (format) => {
    if (!tutorial) return;
    setDownloading(format);
    try {
      const blob = await api.downloadTutorial(tutorial, format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `instructivo.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error descargando el archivo');
    } finally {
      setDownloading('');
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">📖 YouTube a Instructivo</h1>
        <p className="page-description">Convierte tutoriales de YouTube en manuales técnicos paso a paso estructurados por IA.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        {/* Form settings */}
        <div className="glass-panel">
          <form onSubmit={handleProcess} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>


            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Enlace del Video de YouTube</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Youtube size={18} style={{ position: 'absolute', left: '15px', top: '15px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    className="form-input" 
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    style={{ paddingLeft: '45px' }}
                    disabled={loading}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  <Sparkles size={18} />
                  <span>{loading ? 'Procesando...' : 'Generar'}</span>
                </button>
              </div>
            </div>
          </form>

          {loading && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '30px', gap: '15px', backgroundColor: 'rgba(99, 102, 241, 0.05)',
              border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: '12px', marginTop: '20px'
            }}>
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
              <div style={{
                width: '36px', height: '36px', border: '3px solid rgba(99, 102, 241, 0.1)',
                borderTopColor: 'var(--accent-color)', borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ display: 'block', fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.95rem' }}>{statusMessage}</span>
                <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>Este proceso asíncrono descarga el audio del video y lo analiza en segundo plano de forma segura.</span>
              </div>
            </div>
          )}

          {error && (
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '10px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '8px', color: '#f87171', padding: '15px', marginTop: '20px'
            }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Output Document Display */}
        {tutorial && (
          <div className="glass-panel">
            <div style={{ 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
              borderBottom: '1px solid var(--border-color)', paddingBottom: '15px', marginBottom: '20px'
            }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} /> Manual Generado
              </h3>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => handleDownload('md')}
                  disabled={downloading !== ''}
                  style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                >
                  <Download size={14} /> Markdown
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => handleDownload('pdf')}
                  disabled={downloading !== ''}
                  style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                >
                  <Download size={14} /> PDF
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => handleDownload('docx')}
                  disabled={downloading !== ''}
                  style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                >
                  <Download size={14} /> Word
                </button>
              </div>
            </div>

            {/* Display compiled markdown using simple HTML layout */}
            <div style={{ 
              backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '25px', 
              border: '1px solid var(--border-color)', maxHeight: '600px', overflowY: 'auto',
              color: 'var(--text-secondary)', lineHeight: '1.6'
            }}>
              <pre style={{ 
                fontFamily: 'inherit', whiteSpace: 'pre-wrap', 
                fontSize: '0.95rem'
              }}>
                {tutorial}
              </pre>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
