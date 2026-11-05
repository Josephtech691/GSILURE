import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api, { syncOfflineQueue } from '../lib/api';

const NotifContext = createContext(null);

export const NotifProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncMsg, setSyncMsg] = useState(null);

  useEffect(() => {
    const goOnline = async () => {
      setIsOnline(true);
      const result = await syncOfflineQueue();
      if (result.synced > 0) {
        setSyncMsg(`✅ ${result.synced} action(s) synchronisée(s).`);
        window.setTimeout(() => setSyncMsg(null), 4000);
      }
    };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  const charger = useCallback(async () => {
    if (!user) return;
    try {
      const r = await api.get('/notifications');
      setNotifications(Array.isArray(r.data) ? r.data : []);
    } catch (e) { /* conserve les notifications déjà chargées en cas de réseau indisponible */ }
  }, [user]);

  useEffect(() => {
    if (!user) { setNotifications([]); return; }
    charger();
    const timer = window.setInterval(charger, 15000);
    return () => window.clearInterval(timer);
  }, [user, charger]);

  const marquerLu = useCallback(async (id) => {
    setNotifications(p => p.map(n => n.id === id ? { ...n, lu: true } : n));
    try { await api.patch(`/notifications/${id}/lu`); } catch { /* le prochain polling resynchronisera */ }
  }, []);
  const effacerToutes = useCallback(async () => {
    setNotifications([]);
    try { await api.delete('/notifications'); } catch { /* best effort */ }
  }, []);
  const nbNonLues = notifications.filter(n => !n.lu).length;

  return (
    <NotifContext.Provider value={{ notifications, nbNonLues, marquerLu, effacerToutes, isOnline, syncMsg }}>
      {children}
    </NotifContext.Provider>
  );
};

export const useNotifs = () => useContext(NotifContext);
