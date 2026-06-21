import React, { useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../utils/api';
import { Youtube, Sparkles, FileText, Download, AlertCircle } from 'lucide-react';

export default function Transcriber() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [provider, setProvider] = useState('gemini');
  const [customKey, setCustomKey] = useState('');
  const [tutorial, setTutorial] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState('');

  const handleProcess = async (e) => {
    e.preventDefault();
    setError('');
    setTutorial('');
    setLoading(true);

    if (!youtubeUrl) {
      setError('Por favor ingresa un enlace de YouTube');
      setLoading(false);
      return;
    }

    try {
      const res = await api.processVideo(youtubeUrl, provider, customKey || null);
      setTutorial(res.tutorial);
    } catch (err) {
      setError(err.message || 'Error al procesar el video. Revisa la URL.');
    } finally {
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Motor de Inteligencia Artificial</label>
                <select 
                  className="form-input" 
                  value={provider} 
                  onChange={(e) => setProvider(e.target.value)}
                >
                  <option value="mock">Prueba (Modo Mock - Rápido)</option>
                  <option value="gemini">Google Gemini 2.5 Flash</option>
                  <option value="openai">OpenAI GPT-4o-Mini</option>
                </select>
              </div>

              {provider !== 'mock' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">API Key (Opcional, usa clave de servidor .env)</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    placeholder="Ingresa clave API para esta sesión"
                  />
                </div>
              )}
            </div>

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
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  <Sparkles size={18} />
                  <span>{loading ? 'Procesando...' : 'Generar'}</span>
                </button>
              </div>
            </div>
          </form>

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
