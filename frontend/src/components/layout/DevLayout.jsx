import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';

const navItems = [
  { to: '/dev', label: 'Vue d’ensemble', icon: '🧭', end: true },
  { to: '/dev/erreurs', label: 'Erreurs', icon: '🐞', badge: true },
  { to: '/dev/integrite', label: 'Intégrité des données', icon: '🧮' },
  { to: '/dev/systeme', label: 'Système & comptes', icon: '🖥️' },
];

export default function DevLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [ouvert, setOuvert] = useState(false);
  const [ouvertes, setOuvertes] = useState(0);

  useEffect(() => {
    const charger = () => api.get('/dev/erreurs/stats').then(r => setOuvertes(r.data?.erreurs_ouvertes || 0)).catch(() => {});
    charger();
    const t = setInterval(charger, 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 flex flex-col transition-transform duration-300 ${ouvert ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:flex`}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
          <span className="text-2xl">🛠️</span>
          <div><p className="text-white font-bold text-sm">Poissonnerie</p><p className="text-slate-400 text-xs">Espace développeur</p></div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setOuvert(false)}
              className={({ isActive }) => `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
              <span className="flex items-center gap-3"><span>{item.icon}</span>{item.label}</span>
              {item.badge && ouvertes > 0 && <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{ouvertes}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-600 text-white text-xs font-bold flex items-center justify-center">{(user?.prenom || 'D')[0]}{(user?.nom || '')[0]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.prenom} {user?.nom}</p>
              <p className="text-slate-400 text-xs">Développeur</p>
            </div>
            <button onClick={() => { logout(); navigate('/login'); }} className="text-slate-400 hover:text-red-400 text-lg transition" title="Déconnexion">↩</button>
          </div>
        </div>
      </aside>

      {ouvert && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOuvert(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-14 bg-white border-b border-slate-200 flex items-center gap-4 px-4 lg:px-6">
          <button className="lg:hidden text-slate-500 text-xl" onClick={() => setOuvert(true)}>☰</button>
          <span className="text-sm font-semibold text-slate-600">Espace développeur</span>
          <div className="flex-1" />
          {ouvertes > 0 && <NavLink to="/dev/erreurs" className="text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">{ouvertes} erreur(s) ouverte(s)</NavLink>}
        </header>
        <main className="flex-1 p-4 lg:p-6 pb-16"><Outlet /></main>
      </div>
    </div>
  );
}
