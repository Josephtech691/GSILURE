import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifs } from '../../contexts/NotifContext';
import Avatar from '../ui/Avatar';

const navItems = [
  { to: '/admin', label: 'Tableau de bord', icon: '📊', end: true },
  { to: '/admin/stocks', label: 'Stocks & Bacs', icon: '🐟' },
  { to: '/admin/employes', label: 'Employés', icon: '👥' },
  { to: '/admin/demandes', label: 'Demandes', icon: '🔔', badge: true },
  { to: '/admin/profil', label: 'Mon profil', icon: '⚙️' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { nbNonLues, notifications, marquerLu } = useNotifs();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-ocean-950 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:flex`}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-ocean-800">
          <span className="text-2xl">🐟</span>
          <div><p className="text-white font-bold text-sm">Poissonnerie</p><p className="text-ocean-400 text-xs">Administration</p></div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-ocean-700 text-white' : 'text-ocean-300 hover:bg-ocean-800 hover:text-white'}`}>
              <span className="flex items-center gap-3"><span>{item.icon}</span>{item.label}</span>
              {item.badge && nbNonLues > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{nbNonLues}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-ocean-800">
          <div className="flex items-center gap-3">
            <Avatar user={user} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.prenom} {user?.nom}</p>
              <p className="text-ocean-400 text-xs">Administrateur</p>
            </div>
            <button onClick={() => { logout(); navigate('/login'); }} className="text-ocean-400 hover:text-red-400 text-lg transition" title="Déconnexion">↩</button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-14 bg-white border-b border-slate-200 flex items-center gap-4 px-4 lg:px-6">
          <button className="lg:hidden text-slate-500 text-xl" onClick={() => setSidebarOpen(true)}>☰</button>
          <div className="flex-1" />

          {/* Cloche */}
          <div className="relative">
            <button onClick={() => setShowNotifs(!showNotifs)} className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition">
              🔔
              {nbNonLues > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
            </button>
            {showNotifs && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-xl z-50">
                <div className="px-4 py-3 border-b border-slate-100 flex justify-between">
                  <span className="text-sm font-semibold">Notifications</span>
                  <button onClick={() => setShowNotifs(false)} className="text-slate-400 text-xs">✕</button>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                  {notifications.length === 0
                    ? <p className="text-center text-slate-400 text-sm py-6">Aucune notification</p>
                    : notifications.map(n => (
                      <div key={n.id} onClick={() => { marquerLu(n.id); navigate('/admin/demandes'); setShowNotifs(false); }}
                        className={`px-4 py-3 cursor-pointer hover:bg-slate-50 transition ${!n.lu ? 'bg-ocean-50' : ''}`}>
                        <p className="text-sm text-slate-700">{n.message}</p>
                        <p className="text-xs text-slate-400 mt-1">{new Date(n.created_at).toLocaleTimeString('fr')}</p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 pb-16">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
