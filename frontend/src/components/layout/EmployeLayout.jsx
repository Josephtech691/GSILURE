import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifs } from '../../contexts/NotifContext';
import { useState, useEffect } from 'react';
import Avatar from '../ui/Avatar';

export default function EmployeLayout() {
  const { user, logout } = useAuth();
  const { notifications } = useNotifs();
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const derniere = notifications[0];
    if (derniere && derniere.type === 'notification-employe' && !derniere.lu) {
      setToast(derniere);
      setTimeout(() => setToast(null), 5000);
    }
  }, [notifications]);

  const navItems = [
    { to: '/employe', label: 'Ventes', icon: '📅', end: true },
    { to: '/employe/graphique', label: 'Graphique', icon: '📈' },
    { to: '/employe/profil', label: 'Profil', icon: '👤' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
          toast.statut === 'approuvee' ? 'bg-water-50 border-water-200 text-water-800' : 'bg-red-50 border-red-200 text-red-800'
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
