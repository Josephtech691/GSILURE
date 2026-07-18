import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getSocket, connectSocket } from '../../lib/socket';
import api from '../../lib/api';
import Avatar from '../ui/Avatar';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api','') || '';

export default function Chat({ date }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [texte, setTexte] = useState('');
  const [connecte, setConnecte] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const scrollBas = useCallback(() => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50), []);

  useEffect(() => {
    if (!date || !ouvert) return;
    const socket = connectSocket();

    const onConnect = () => { setConnecte(true); socket.emit('rejoindre-salon', { date }); };
    const onDisconnect = () => setConnecte(false);
    const onHistorique = (msgs) => { setMessages(msgs); scrollBas(); };
    const onMessage = (msg) => { setMessages(p => p.find(m => m.id === msg.id) ? p : [...p, msg]); scrollBas(); };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('historique-messages', onHistorique);
    socket.on('message-recu', onMessage);
    if (socket.connected) onConnect();

    return () => { socket.off('connect', onConnect); socket.off('disconnect', onDisconnect); socket.off('historique-messages', onHistorique); socket.off('message-recu', onMessage); };
  }, [date, ouvert, scrollBas]);

  const envoyer = async (e) => {
    e.preventDefault();
    if (!texte.trim() || envoi) return;
    setEnvoi(true);
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('nouveau-message', { date, contenu: texte.trim() });
      setTexte('');
    } else {
      try {
        const res = await api.post(`/chat/${date}`, { contenu: texte.trim() });
        setMessages(p => [...p, res.data]);
        setTexte('');
        scrollBas();
      } catch {}
    }
    setEnvoi(false);
    inputRef.current?.focus();
  };

  const formatH = (ts) => new Date(ts).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOuvert(!ouvert)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition">
        <div className="flex items-center gap-2">
          <span>💬</span>
          <span className="font-semibold text-slate-700 text-sm">
            Discussion — {new Date(date+'T12:00:00').toLocaleDateString('fr', { weekday:'short', day:'numeric', month:'short' })}
          </span>
          {messages.length > 0 && <span className="text-xs text-slate-400">({messages.length})</span>}
        </div>
        <div className="flex items-center gap-2">
          {connecte && ouvert && <span className="flex items-center gap-1 text-xs text-water-600"><span className="w-1.5 h-1.5 bg-water-500 rounded-full animate-pulse"/>En ligne</span>}
          <span className="text-slate-400 text-sm">{ouvert ? '▲' : '▼'}</span>
        </div>
      </button>

      {ouvert && (
        <>
          <div className="h-72 overflow-y-auto px-4 py-3 space-y-3 bg-slate-50 border-t border-slate-100">
            {messages.length === 0
              ? <div className="h-full flex items-center justify-center"><p className="text-slate-400 text-sm text-center">Aucun message. Soyez le premier !</p></div>
              : messages.map(msg => {
                const estMoi = msg.auteur_id === user.id;
                const auteurUser = { nom: msg.auteur_nom?.split(' ').slice(-1)[0] || '', prenom: msg.auteur_nom?.split(' ')[0] || '', photo_url: msg.auteur_photo };
                return (
                  <div key={msg.id} className={`flex gap-2 ${estMoi ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!estMoi && <Avatar user={auteurUser} size="sm" className="shrink-0 mt-1" />}
                    <div className={`max-w-[75%] flex flex-col ${estMoi ? 'items-end' : 'items-start'}`}>
                      {!estMoi && (
                        <span className={`text-xs font-semibold mb-0.5 ${msg.auteur_role === 'admin' ? 'text-ocean-600' : 'text-water-600'}`}>
                          {msg.auteur_role === 'admin' ? '👑 ' : ''}{msg.auteur_nom}
                        </span>
                      )}
                      <div className={`rounded-2xl px-3.5 py-2 ${estMoi ? 'bg-ocean-600 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm'}`}>
                        <p className="text-sm leading-snug whitespace-pre-wrap break-words">{msg.contenu}</p>
                      </div>
                      <span className="text-xs text-slate-400 mt-0.5 px-1">{formatH(msg.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={envoyer} className="flex gap-2 p-3 border-t border-slate-100 bg-white">
            <input ref={inputRef} type="text" value={texte} onChange={e => setTexte(e.target.value)}
              placeholder="Écrire un message…" className="input flex-1 text-sm" maxLength={500} />
            <button type="submit" disabled={!texte.trim() || envoi} className="btn-primary px-4">{envoi ? '…' : '↑'}</button>
          </form>
        </>
      )}
    </div>
  );
}
