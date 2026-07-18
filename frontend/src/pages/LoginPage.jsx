import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      navigate(user.role === 'admin' ? '/admin' : '/employe', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Identifiants incorrects.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-950 via-ocean-800 to-water-700 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-water-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-ocean-400/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur mb-4">
            <span className="text-3xl">🐟</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Poissonnerie</h1>
          <p className="text-ocean-200 text-sm mt-1">Gestion des ventes d'eau douce</p>
        </div>

        {/* Carte */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-ocean-100 mb-1.5">Adresse email</label>
              <input
                type="email" required autoComplete="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-ocean-300 focus:outline-none focus:ring-2 focus:ring-white/40 transition"
                placeholder="votre@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ocean-100 mb-1.5">Mot de passe</label>
              <input
                type="password" required autoComplete="current-password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-ocean-300 focus:outline-none focus:ring-2 focus:ring-white/40 transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/20 border border-red-400/30 text-red-200 text-sm">
                <span>⚠️</span><span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-white text-ocean-900 font-semibold rounded-lg hover:bg-ocean-50 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-ocean-600 border-t-transparent rounded-full animate-spin" />Connexion…</>
              ) : 'Se connecter'}
            </button>
          </form>
        </div>

        <p className="text-center text-ocean-300/50 text-xs mt-6">
          © {new Date().getFullYear()} Poissonnerie d'eau douce
        </p>
      </div>
    </div>
  );
}
