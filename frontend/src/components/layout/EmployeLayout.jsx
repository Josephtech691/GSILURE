import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifs } from '../../contexts/NotifContext';
import { useState, useEffect } from 'react';
import Avatar from '../ui/Avatar';

export default function EmployeLayout() {
  const { user, logout } = useAuth();
  const { notifications, nbNonLues, marquerLu } = useNotifs();
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    const derniere = notifications[0];
    if (derniere && derniere.type === 'demande_reponse' && !derniere.lu) {
      setToast(derniere);
      setTimeout(() => setToast(null), 5000);
    }
  }, [notifications]);

  const navItems = [
    { to: '/employe', label: 'Ventes', icon: '📅', end: true },
    { to: '/employe/graphique', label: 'Graphique', icon: '📈' },
    { to: '/employe/demandes', label: 'Demandes', icon: '📨' },
    { to: '/employe/profil', label: 'Profil', icon: '👤' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
          'bg-ocean-50 border-ocean-200 text-ocean-800'
        }`}>
          {toast.message}
        </div>
      )}

      <header className="sticky top-0 z-20 h-14 bg-ocean-950 flex items-center px-4 gap-3">
        <span className="text-xl">🐟</span>
        <span className="text-white font-semibold text-sm flex-1 truncate">Poissonnerie</span>

        <nav className="flex items-center gap-0.5">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) => `px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ${isActive ? 'bg-white/20 text-white' : 'text-ocean-300 hover:text-white'}`}>
              <span>{item.icon}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowNotifs(v => !v)} className="relative p-2 text-ocean-200 hover:bg-ocean-800 rounded-lg" aria-label="Ouvrir les notifications">
              🔔{nbNonLues > 0 && <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-4">{nbNonLues}</span>}
            </button>
            {showNotifs && <div className="absolute right-0 top-full mt-2 w-80 max-w-[90vw] bg-white text-slate-700 rounded-xl border border-slate-200 shadow-xl z-50">
              <div className="px-4 py-3 border-b border-slate-100 flex justify-between"><span className="text-sm font-semibold">Notifications</span><button onClick={() => setShowNotifs(false)} className="text-xs text-slate-400">✕</button></div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? <p className="text-center text-slate-400 text-sm py-6">Aucune notification</p> : notifications.map(n => <button key={n.id} onClick={() => { marquerLu(n.id); setShowNotifs(false); if (n.type === 'demande_reponse') navigate('/employe/demandes'); }} className={`w-full text-left px-4 py-3 hover:bg-slate-50 ${!n.lu ? 'bg-ocean-50' : ''}`}><p className="text-sm">{n.message}</p><p className="text-xs text-slate-400 mt-1">{new Date(n.created_at).toLocaleString('fr')}</p></button>)}
              </div>
            </div>}
          </div>
          <button onClick={() => navigate('/employe/profil')}>
            <Avatar user={user} size="sm" />
          </button>
          <button onClick={() => { logout(); navigate('/login'); }} className="text-ocean-400 hover:text-red-400 text-base transition" title="Déconnexion">↩</button>
        </div>
      </header>

      <main className="flex-1 p-4 lg:p-6 pb-16">
        <Outlet />
      </main>
    </div>
  );
}
