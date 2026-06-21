import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { api } from '../utils/api';
import { Send, MessageSquare } from 'lucide-react';

export default function FamilyChat() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [username, setUsername] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const chatHistoryRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setUsername(localStorage.getItem('username') || '');
      // Load historical messages
      fetchHistory();
      // Setup WebSocket
      connectWebSocket();
    }

    // Clean up WebSocket on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchHistory = async () => {
    try {
      const history = await api.getChatHistory();
      if (Array.isArray(history)) {
        setMessages(history);
      }
    } catch (err) {
      console.error('Error fetching chat history:', err);
    }
  };

  const connectWebSocket = () => {
    const wsUrl = api.getWebSocketUrl();
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket Connected');
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.error) {
        console.error('WebSocket Error:', msg.error);
        return;
      }
      setMessages(prev => {
        // Prevent duplicates
        if (prev.some(item => item.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    ws.onclose = () => {
      console.log('WebSocket Disconnected. Reconnecting in 3 seconds...');
      setWsConnected(false);
      setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    const token = localStorage.getItem('token');
    
    if (wsConnected && wsRef.current) {
      // Send via WebSocket
      wsRef.current.send(JSON.stringify({
        token: token,
        message: text
      }));
      setText('');
    } else {
      // Fallback to HTTP POST
      try {
        const newMsg = await api.sendChatMessage(text);
        setMessages(prev => [...prev, newMsg]);
        setText('');
      } catch (err) {
        console.error('Error sending message via HTTP:', err);
      }
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
      <div className="page-header">
        <h1 className="page-title">💬 Chat Familiar</h1>
        <p className="page-description">Espacio común para conversar y coordinar con los integrantes de la casa.</p>
      </div>

      <div className="glass-panel chat-window">
        {/* Connection status banner */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '15px',
          paddingBottom: '10px', borderBottom: '1px solid var(--border-color)'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={16} /> Sala General
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ 
              width: '8px', height: '8px', borderRadius: '50%',
              backgroundColor: wsConnected ? 'var(--success-color)' : '#eab308' 
            }} />
            {wsConnected ? 'Tiempo Real Conectado' : 'Conectando/HTTP Polling'}
          </span>
        </div>

        {/* Messages Feed */}
        <div className="chat-history" ref={chatHistoryRef}>
          {!Array.isArray(messages) || messages.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '100px' }}>
              No hay mensajes todavía. Escribe un saludo familiar.
            </div>
          ) : (
            Array.isArray(messages) && messages.map((msg) => {
              const isMine = msg.username === username;
              return (
                <div 
                  key={msg.id} 
                  className={`chat-bubble ${isMine ? 'mine' : 'other'}`}
                >
                  <div className="chat-author">{msg.username}</div>
                  <div style={{ wordBreak: 'break-word', fontSize: '0.95rem' }}>{msg.message}</div>
                  <div className="chat-timestamp">{formatTime(msg.created_at)}</div>
                </div>
              );
            })
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="chat-input-bar">
          <input 
            type="text" 
            className="form-input" 
            value={text} 
            onChange={(e) => setText(e.target.value)} 
            placeholder="Escribe un mensaje familiar..."
            autoFocus
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '12px 18px' }}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </Layout>
  );
}
