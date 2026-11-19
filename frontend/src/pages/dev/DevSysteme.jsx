import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';

const ROLES = { admin: 'Admin', employee: 'Employé', developer: 'Développeur' };
const fmtUptime = (s) => s > 3600 ? `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min` : `${Math.floor(s / 60)} min ${s % 60} s`;

export default function DevSysteme() {
  const [sante, setSante] = useState(null);
  const [comptes, setComptes] = useState([]);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async () => {
    setChargement(true);
    const [s, c] = await Promise.all([api.get('/dev/sante').catch(() => null), api.get('/dev/comptes').catch(() => null)]);
    setSante(s?.data || null); setComptes(c?.data || []); setChargement(false);
  }, []);
  useEffect(() => { charger(); }, [charger]);

  if (chargement) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-ocean-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!sante) return <div className="card p-6 text-sm text-red-700 bg-red-50">Impossible de joindre le serveur.</div>;

  const ligne = (k, v, mauvais) => (
    <div className="flex justify-between gap-3 px-4 py-2.5 text-sm"><span className="text-slate-500">{k}</span><span className={`font-medium text-right ${mauvais ? 'text-red-600' : 'text-slate-800'}`}>{v}</span></div>
  );

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-slate-800">Système & comptes</h1><p className="text-sm text-slate-500">Serveur, base de données, configuration et utilisateurs.</p></div>
        <button className="btn-secondary" onClick={charger}>↻ Actualiser</button>
      </div>

      <div className="card divide-y divide-slate-100">
        <p className="px-4 py-3 text-sm font-semibold text-slate-600">Serveur</p>
        {ligne('Node.js', sante.serveur.node)}
        {ligne('Environnement', sante.serveur.environnement)}
        {ligne('Actif depuis', fmtUptime(sante.serveur.uptime_s))}
        {ligne('Mémoire', `${sante.serveur.memoire_mo} Mo`)}
      </div>

      <div className="card divide-y divide-slate-100">
        <p className="px-4 py-3 text-sm font-semibold text-slate-600">Base de données</p>
        {sante.base.ok ? <>
          {ligne('État', '🟢 Connectée')}
          {ligne('Latence', `${sante.base.latence_ms} ms`, sante.base.latence_ms > 800)}
          {ligne('Version', sante.base.version)}
          {ligne('Taille', `${sante.base.taille_mo} Mo`)}
        </> : ligne('État', `🔴 ${sante.base.erreur}`, true)}
      </div>

      <div className="card divide-y divide-slate-100">
        <p className="px-4 py-3 text-sm font-semibold text-slate-600">Variables de configuration</p>
        {sante.variables.map(v => ligne(v.nom, v.definie ? '✅ Définie' : '⚠️ Manquante', !v.definie && ['DATABASE_URL', 'JWT_SECRET'].includes(v.nom)))}
        <p className="px-4 py-2 text-[11px] text-slate-400">Seule la présence est indiquée, jamais la valeur.</p>
      </div>

      <div className="card divide-y divide-slate-100">
        <p className="px-4 py-3 text-sm font-semibold text-slate-600">Tables</p>
        {sante.tables.map(t => ligne(t.nom, t.absente ? 'absente' : `${t.lignes} ligne(s)`, t.absente))}
      </div>

      <div className="card overflow-hidden">
        <p className="px-4 py-3 text-sm font-semibold text-slate-600 border-b border-slate-100">Comptes ({comptes.length})</p>
        <div className="divide-y divide-slate-100">
          {comptes.map(c => (
            <div key={c.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0"><p className="text-sm font-medium text-slate-800 truncate">{c.prenom} {c.nom}</p><p className="text-xs text-slate-400 truncate">{c.email}</p></div>
              <div className="text-right shrink-0">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{ROLES[c.role] || c.role}</span>
                <p className={`text-[11px] mt-0.5 ${c.actif ? 'text-green-600' : 'text-red-500'}`}>{c.actif ? 'Actif' : 'Désactivé'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
