import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSocket } from '../lib/socket';
import { useAuth } from './AuthContext';
import { syncOfflineQueue } from '../lib/api';

const NotifContext = createContext(null);

export const NotifProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncMsg, setSyncMsg] = useState(null);

  // Suivi connexion réseau
  useEffect(() => {
    const goOnline = async () => {
      setIsOnline(true);
      const result = await syncOfflineQueue();
      if (result.synced > 0) {
        setSyncMsg(`✅ ${result.synced} action(s) synchronisée(s).`);
        setTimeout(() => setSyncMsg(null), 4000);
      }
    };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // Écoute SW trigger
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (e) => {
        if (e.data?.type === 'TRIGGER_SYNC') goOnline();
      });
    }

    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  // Notifs socket
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    const addNotif = (data) => setNotifications(prev => [{ ...data, id: Date.now(), lu: false }, ...prev].slice(0, 50));
    socket.on('notification-admin', (d) => { if (user.role === 'admin') addNotif(d); });
    socket.on('notification-employe', (d) => { if (user.role === 'employee' && d.employe_id === user.id) addNotif({ ...d, message: `Demande du ${d.date} : ${d.statut === 'approuvee' ? 'approuvée ✅' : 'refusée ❌'}` }); });
    return () => { socket.off('notification-admin'); socket.off('notification-employe'); };
  }, [user]);

  const marquerLu = useCallback((id) => setNotifications(p => p.map(n => n.id === id ? { ...n, lu: true } : n)), []);
  const effacerToutes = useCallback(() => setNotifications([]), []);
  const nbNonLues = notifications.filter(n => !n.lu).length;

  return (
    <NotifContext.Provider value={{ notifications, nbNonLues, marquerLu, effacerToutes, isOnline, syncMsg }}>
      {children}
    </NotifContext.Provider>
  );
};

export const useNotifs = () => useContext(NotifContext);
