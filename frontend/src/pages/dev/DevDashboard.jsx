import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';

const COULEUR = { ok: 'text-green-700 bg-green-50', info: 'text-ocean-700 bg-ocean-50', warn: 'text-amber-700 bg-amber-50', error: 'text-red-700 bg-red-50' };
const LIBELLE = { ok: 'Tout est bon', info: 'Information', warn: 'À surveiller', error: 'À corriger' };

export default function DevDashboard() {
  const [stats, setStats] = useState(null);
  const [recentes, setRecentes] = useState([]);
  const [integrite, setIntegrite] = useState(null);
  const [sante, setSante] = useState(null);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async () => {
    setChargement(true);
    const [s, e, i, h] = await Promise.all([
      api.get('/dev/erreurs/stats').catch(() => null),
      api.get('/dev/erreurs', { params: { resolu: 'false', limit: 5 } }).catch(() => null),
      api.get('/dev/integrite').catch(() => null),
      api.get('/dev/sante').catch(() => null),
    ]);
    setStats(s?.data || null); setRecentes(e?.data?.items || []); setIntegrite(i?.data || null); setSante(h?.data || null);
    setChargement(false);
  }, []);
  useEffect(() => { charger(); }, [charger]);

  if (chargement) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-ocean-500 border-t-transparent rounded-full animate-spin" /></div>;

  const max = Math.max(1, ...(stats?.par_jour || []).map(j => j.nb));
  const aCorriger = (integrite?.controles || []).filter(c => c.statut === 'warn' || c.statut === 'error');

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Vue d’ensemble</h1>
          <p className="text-sm text-slate-500">État de santé de l’application</p>
        </div>
        <button className="btn-secondary" onClick={charger}>↻ Actualiser</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`stat-card ${sante?.base?.ok ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
          <p className="text-xs opacity-70 mb-1">Base de données</p>
          <p className="text-xl font-bold">{sante?.base?.ok ? `${sante.base.latence_ms} ms` : 'Hors service'}</p>
        </div>
        <div className={`stat-card ${(stats?.erreurs_ouvertes || 0) > 0 ? 'text-red-700 bg-red-50' : 'text-green-700 bg-green-50'}`}>
          <p className="text-xs opacity-70 mb-1">Erreurs ouvertes</p>
          <p className="text-xl font-bold">{stats?.erreurs_ouvertes ?? '—'}</p>
        </div>
        <div className="stat-card text-slate-700 bg-slate-50">
          <p className="text-xs opacity-70 mb-1">Occurrences 24 h</p>
          <p className="text-xl font-bold">{stats?.occurrences_24h ?? '—'}</p>
        </div>
        <div className={`stat-card ${COULEUR[integrite?.statut_global || 'ok']}`}>
          <p className="text-xs opacity-70 mb-1">Intégrité des données</p>
          <p className="text-base font-bold">{LIBELLE[integrite?.statut_global || 'ok']}</p>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="text-sm font-semibold text-slate-600 mb-3">Erreurs des 7 derniers jours</h2>
        <div className="flex items-end gap-2 h-24">
          {(stats?.par_jour || []).map(j => (
            <div key={j.jour} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-red-400 rounded-t" style={{ height: `${Math.max(j.nb ? 6 : 2, (j.nb / max) * 80)}px`, opacity: j.nb ? 1 : 0.25 }} title={`${j.nb}`} />
              <span className="text-[10px] text-slate-400">{j.jour.slice(8)}/{j.jour.slice(5, 7)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-600">Dernières erreurs ouvertes</h2>
          <Link to="/dev/erreurs" className="text-xs text-ocean-600 font-medium">Tout voir →</Link>
        </div>
        {recentes.length === 0
          ? <p className="text-center text-sm text-slate-400 py-6">Aucune erreur ouverte 🎉</p>
          : <div className="divide-y divide-slate-100">{recentes.map(e => (
              <Link to="/dev/erreurs" key={e.id} className="block px-4 py-3 hover:bg-slate-50">
                <p className="text-sm text-slate-700 line-clamp-2">{e.message}</p>
                <p className="text-xs text-slate-400 mt-1">{e.source} · {e.route || '—'} · ×{e.occurrences} · {new Date(e.derniere_vue).toLocaleString('fr')}</p>
              </Link>))}</div>}
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-600">Contrôles à traiter</h2>
          <Link to="/dev/integrite" className="text-xs text-ocean-600 font-medium">Détail →</Link>
        </div>
        {aCorriger.length === 0
          ? <p className="text-center text-sm text-slate-400 py-6">Aucun point à corriger ✅</p>
          : <div className="divide-y divide-slate-100">{aCorriger.map(c => (
              <div key={c.id} className="px-4 py-3">
                <p className="text-sm font-medium text-slate-700">{c.statut === 'error' ? '🔴' : '🟠'} {c.titre}</p>
                <p className="text-xs text-slate-500 mt-0.5">{c.resume}</p>
              </div>))}</div>}
      </div>
    </div>
  );
}
