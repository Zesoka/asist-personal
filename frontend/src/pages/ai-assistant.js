import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { api } from '../utils/api';
import { Send, Cat, User, Trash2, Sparkles, AlertCircle } from 'lucide-react';

export default function AIAssistant() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const chatHistoryRef = useRef(null);

  // Quick suggestion chips
  const suggestionChips = [
    { label: '💡 Ideas para cenar', prompt: '¿Qué ideas de cena rápida y rica tenés para hoy?' },
    { label: '📅 Resumen del día', prompt: '¿Me das un resumen o consejos para organizar el día?' },
    { label: '🤖 Chiste técnico', prompt: 'Contame un chiste de programadores o de tecnología.' },
    { label: '🧘 Rutina rápida', prompt: 'Sugerime una rutina matutina de 5 minutos para empezar con energía.' }
  ];

  useEffect(() => {
    fetchHistory();
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const fetchHistory = async () => {
    try {
      setError('');
      const history = await api.getAIHistory();
      if (Array.isArray(history)) {
        setMessages(history);
      }
    } catch (err) {
      console.error('Error fetching AI history:', err);
      setError('No se pudo cargar el historial del asistente.');
    }
  };

  const handleSend = async (messageText) => {
    const trimmed = messageText.trim();
    if (!trimmed) return;

    setError('');
    // Optimistically add user message to the feed
    const tempUserMsg = {
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setText('');
    setLoading(true);

    try {
      const response = await api.sendAIChatMessage(trimmed);
      // Add assistant response to the feed
      const tempAiMsg = {
        role: 'assistant',
        content: response.response,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, tempAiMsg]);
    } catch (err) {
      console.error('Error in chat response:', err);
      setError('Hubo un problema al obtener respuesta de Milo. Reintenta por favor.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    handleSend(text);
  };

  const handleClearHistory = async () => {
    const confirmClear = window.confirm('¿Estás seguro de que deseas vaciar tu conversación con Milo? Esta acción no se puede deshacer.');
    if (!confirmClear) return;

    try {
      setError('');
      await api.clearAIHistory();
      setMessages([]);
    } catch (err) {
      console.error('Error clearing history:', err);
      setError('No se pudo limpiar el historial. Reintenta.');
    }
  };

  const formatTime = (isoString) => {
    try {
      const dt = new Date(isoString);
      return dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  return (
    <Layout>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 className="page-title">🐱 Asistente de IA (Milo)</h1>
          <p className="page-description">Tu asistente inteligente familiar para organizar el día, recetas, dudas y más.</p>
        </div>
        {messages.length > 0 && (
          <button 
            onClick={handleClearHistory} 
            className="btn btn-secondary" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              border: '1px solid rgba(239, 68, 68, 0.2)', 
              color: '#ef4444',
              padding: '10px 16px',
              fontSize: '0.85rem'
            }}
          >
            <Trash2 size={16} />
            <span>Borrar Historial</span>
          </button>
        )}
      </div>

      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '10px',
          color: '#ef4444',
          marginBottom: '20px',
          fontSize: '0.9rem'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="glass-panel chat-window" style={{ height: '620px', display: 'flex', flexDirection: 'column' }}>
        {/* Assistant Header Status */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '15px',
          paddingBottom: '10px', borderBottom: '1px solid var(--border-color)'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', color: 'var(--accent-color)' }}>
            <Cat size={18} /> Conversando con Milo
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Privado y único para tu cuenta
          </span>
        </div>

        {/* Message Feed */}
        <div className="chat-history" ref={chatHistoryRef} style={{ padding: '20px', gap: '20px' }}>
          {messages.length === 0 && !loading ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-muted)',
              textAlign: 'center',
              gap: '15px',
              padding: '20px'
            }}>
              <Cat size={48} style={{ color: 'var(--accent-color)', opacity: 0.6 }} />
              <div>
                <p style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>¡Hola! Soy Milo, el felino más inteligente del mundo.</p>
                <p style={{ fontSize: '0.9rem' }}>¿En qué te puedo ayudar hoy? Podés escribirme o usar una sugerencia:</p>
              </div>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '10px',
                maxWidth: '500px',
                marginTop: '10px'
              }}>
                {suggestionChips.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(chip.prompt)}
                    className="btn btn-secondary"
                    style={{
                      padding: '8px 14px',
                      fontSize: '0.8rem',
                      borderRadius: '20px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                      e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={index}
                    className={`chat-bubble ${isUser ? 'mine' : 'other'}`}
                    style={{
                      padding: '14px 18px',
                      borderRadius: '16px',
                      maxWidth: '75%',
                      borderBottomRightRadius: isUser ? '4px' : '16px',
                      borderBottomLeftRadius: !isUser ? '4px' : '16px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div className="chat-author" style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      marginBottom: '6px',
                      color: isUser ? 'rgba(255, 255, 255, 0.9)' : 'var(--accent-color)'
                    }}>
                      {isUser ? <User size={12} /> : <Cat size={12} />}
                      <span>{isUser ? 'Tú' : 'Milo'}</span>
                    </div>
                    <div style={{ 
                      wordBreak: 'break-word', 
                      fontSize: '0.95rem', 
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {msg.content}
                    </div>
                    <div className="chat-timestamp" style={{ marginTop: '8px', fontSize: '0.7rem' }}>
                      {formatTime(msg.created_at)}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div
                  className="chat-bubble other"
                  style={{
                    padding: '14px 18px',
                    borderRadius: '16px',
                    borderBottomLeftRadius: '4px',
                    alignSelf: 'flex-start',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                >
                  <div className="chat-author" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-color)' }}>
                    <Cat size={12} />
                    <span>Milo escribiendo...</span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', padding: '6px 0' }}>
                    <span className="dot-blink" style={{ width: '8px', height: '8px', backgroundColor: 'var(--text-secondary)', borderRadius: '50%', display: 'inline-block' }}></span>
                    <span className="dot-blink" style={{ width: '8px', height: '8px', backgroundColor: 'var(--text-secondary)', borderRadius: '50%', display: 'inline-block', animationDelay: '0.2s' }}></span>
                    <span className="dot-blink" style={{ width: '8px', height: '8px', backgroundColor: 'var(--text-secondary)', borderRadius: '50%', display: 'inline-block', animationDelay: '0.4s' }}></span>
                  </div>
                  <style jsx global>{`
                    @keyframes blink {
                      0% { opacity: 0.2; transform: scale(0.8); }
                      50% { opacity: 1; transform: scale(1.1); }
                      100% { opacity: 0.2; transform: scale(0.8); }
                    }
                    .dot-blink {
                      animation: blink 1.4s infinite both;
                    }
                  `}</style>
                </div>
              )}
            </>
          )}
        </div>

        {/* Suggestion Chips (Visible at bottom when chat has messages to quickly type/prompt) */}
        {messages.length > 0 && !loading && (
          <div style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            padding: '8px 0',
            marginBottom: '10px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}>
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(chip.prompt)}
                className="btn btn-secondary"
                style={{
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  borderRadius: '16px',
                  whiteSpace: 'nowrap',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)'
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={onSubmit} className="chat-input-bar">
          <input 
            type="text" 
            className="form-input" 
            value={text} 
            onChange={(e) => setText(e.target.value)} 
            placeholder="Pregúntale algo a Milo..."
            disabled={loading}
            autoFocus
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '12px 18px' }} disabled={loading || !text.trim()}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </Layout>
  );
}
