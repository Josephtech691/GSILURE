import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import AdminLayout from './components/layout/AdminLayout';
import EmployeLayout from './components/layout/EmployeLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminStocks from './pages/admin/AdminStocks';
import AdminEmployes from './pages/admin/AdminEmployes';
import AdminDemandes from './pages/admin/AdminDemandes';
import AdminProfil from './pages/admin/AdminProfil';
import EmployeJournee from './pages/employe/EmployeJournee';
import EmployeGraphique from './pages/employe/EmployeGraphique';
import EmployeProfil from './pages/employe/EmployeProfil';
import OfflineBanner from './components/ui/OfflineBanner';

function RequireAuth({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-ocean-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Chargement…</p>
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;

  return (
    <>
      <OfflineBanner />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />

        <Route path="/admin" element={<RequireAuth role="admin"><AdminLayout /></RequireAuth>}>
          <Route index element={<AdminDashboard />} />
          <Route path="stocks" element={<AdminStocks />} />
          <Route path="employes" element={<AdminEmployes />} />
          <Route path="demandes" element={<AdminDemandes />} />
          <Route path="profil" element={<AdminProfil />} />
        </Route>

        <Route path="/employe" element={<RequireAuth role="employee"><EmployeLayout /></RequireAuth>}>
          <Route index element={<EmployeJournee />} />
          <Route path="graphique" element={<EmployeGraphique />} />
          <Route path="profil" element={<EmployeProfil />} />
        </Route>

        <Route path="/" element={
          !user ? <Navigate to="/login" replace /> :
          user.role === 'admin' ? <Navigate to="/admin" replace /> :
          <Navigate to="/employe" replace />
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
