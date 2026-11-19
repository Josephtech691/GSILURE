import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import { useToast, ToastDisplay } from '../../components/ui/Toast';

const SOURCES = { backend: '🖧 Serveur', frontend: '🖥️ Navigateur', api: '🌐 Réseau/API', offline: '📴 Hors ligne' };
const PAGE = 30;

function rapport(e) {
  return [
    `[${e.niveau.toUpperCase()}] ${e.message}`,
    `Source : ${e.source} | Route : ${e.methode || ''} ${e.route || '—'} | HTTP : ${e.statut_http || '—'}`,
    `Occurrences : ${e.occurrences} | Dernière : ${new Date(e.derniere_vue).toLocaleString('fr')}`,
    `Utilisateur : ${e.user_email || 'anonyme'} (${e.user_role || '—'})`,
    e.contexte ? `Contexte : ${JSON.stringify(e.contexte)}` : '',
    e.stack ? `\nStack :\n${e.stack}` : '',
  ].filter(Boolean).join('\n');
}

export default function DevErreurs() {
  const { toast, show } = useToast();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [filtres, setFiltres] = useState({ source: '', niveau: '', resolu: 'false', q: '' });
  const [ouvert, setOuvert] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [notes, setNotes] = useState({});

  const charger = useCallback(async (offset = 0) => {
    setChargement(true);
    try {
      const params = { limit: PAGE, offset };
      Object.entries(filtres).forEach(([k, v]) => { if (v) params[k] = v; });
      const r = await api.get('/dev/erreurs', { params });
      setItems(prev => offset ? [...prev, ...r.data.items] : r.data.items);
      setTotal(r.data.total);
    } catch (e) { show(e.response?.data?.message || 'Chargement impossible', 'error'); }
    finally { setChargement(false); }
  }, [filtres]);

  useEffect(() => { const t = setTimeout(() => charger(0), 250); return () => clearTimeout(t); }, [charger]);

  const maj = async (e, corps) => {
    try {
      const r = await api.patch(`/dev/erreurs/${e.id}`, corps);
      setItems(p => p.map(x => x.id === e.id ? r.data : x).filter(x => filtres.resolu === '' || String(x.resolu) === filtres.resolu));
      show(corps.resolu === true ? 'Marquée comme résolue' : corps.resolu === false ? 'Rouverte' : 'Note enregistrée', 'success');
    } catch (err) { show(err.response?.data?.message || 'Erreur', 'error'); }
  };

  const copier = async (e) => {
    try { await navigator.clipboard.writeText(rapport(e)); show('Rapport copié', 'success'); }
    catch { show('Copie impossible', 'error'); }
  };

  const purger = async () => {
    if (!window.confirm('Supprimer définitivement toutes les erreurs résolues ?')) return;
    try { const r = await api.delete('/dev/erreurs/resolues'); show(r.data.message, 'success'); charger(0); }
    catch (err) { show(err.response?.data?.message || 'Erreur', 'error'); }
  };

  const tester = async () => {
    try { await api.post('/dev/erreurs/test'); show('Erreur de test créée', 'success'); setFiltres(f => ({ ...f })); }
    catch (err) { show(err.response?.data?.message || 'Erreur', 'error'); }
  };

  return (
    <div className="max-w-4xl space-y-4">
      <ToastDisplay toast={toast} />
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Journal des erreurs</h1>
        <p className="text-sm text-slate-500">Serveur, navigateur, réseau et synchronisation hors ligne — regroupées quand elles se répètent.</p>
      </div>

      <div className="card p-3 grid grid-cols-2 lg:grid-cols-4 gap-2">
        <select className="input" value={filtres.resolu} onChange={e => setFiltres({ ...filtres, resolu: e.target.value })}>
          <option value="false">Ouvertes</option><option value="true">Résolues</option><option value="">Toutes</option>
        </select>
        <select className="input" value={filtres.source} onChange={e => setFiltres({ ...filtres, source: e.target.value })}>
          <option value="">Toutes sources</option>{Object.entries(SOURCES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="input" value={filtres.niveau} onChange={e => setFiltres({ ...filtres, niveau: e.target.value })}>
          <option value="">Tous niveaux</option><option value="error">Erreurs</option><option value="warning">Avertissements</option>
        </select>
        <input className="input" placeholder="Rechercher…" value={filtres.q} onChange={e => setFiltres({ ...filtres, q: e.target.value })} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">{total} résultat(s)</p>
        <div className="flex gap-2">
          <button className="btn-secondary !py-1.5 !text-xs" onClick={tester}>Créer un test</button>
          <button className="btn-secondary !py-1.5 !text-xs" onClick={purger}>🧹 Purger les résolues</button>
        </div>
      </div>

      {chargement && items.length === 0 && <div className="flex justify-center py-10"><div className="w-7 h-7 border-4 border-ocean-500 border-t-transparent rounded-full animate-spin" /></div>}
      {!chargement && items.length === 0 && <div className="card p-8 text-center text-sm text-slate-400">Aucune erreur pour ces filtres 🎉</div>}

      <div className="space-y-2">
        {items.map(e => {
          const estOuvert = ouvert === e.id;
          return (
            <div key={e.id} className={`card overflow-hidden ${e.resolu ? 'opacity-70' : ''}`}>
              <button className="w-full text-left px-4 py-3" onClick={() => setOuvert(estOuvert ? null : e.id)}>
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${e.niveau === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{e.niveau === 'error' ? 'Erreur' : 'Avertissement'}</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{SOURCES[e.source] || e.source}</span>
                  {e.statut_http && <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">HTTP {e.statut_http}</span>}
                  {e.occurrences > 1 && <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-ocean-100 text-ocean-700">×{e.occurrences}</span>}
                  {e.resolu && <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">Résolue</span>}
                </div>
                <p className="text-sm font-medium text-slate-800 break-words">{e.message}</p>
                <p className="text-xs text-slate-400 mt-1 break-all">{e.methode} {e.route || '—'} · {e.user_email || 'anonyme'} · {new Date(e.derniere_vue).toLocaleString('fr')}</p>
              </button>

              {estOuvert && (
                <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
                  <p className="text-xs text-slate-500">Première apparition : {new Date(e.premiere_vue).toLocaleString('fr')}{e.user_role ? ` · rôle : ${e.user_role}` : ''}</p>
                  {e.stack && <pre className="text-[11px] bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words max-h-64">{e.stack}</pre>}
                  {e.contexte && <pre className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words max-h-40">{JSON.stringify(e.contexte, null, 2)}</pre>}
                  {e.user_agent && <p className="text-[11px] text-slate-400 break-words">{e.user_agent}</p>}
                  <textarea className="input" rows={2} placeholder="Note (cause, correction…)" value={notes[e.id] ?? e.note ?? ''} onChange={ev => setNotes({ ...notes, [e.id]: ev.target.value })} />
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-secondary !py-1.5 !text-xs" onClick={() => copier(e)}>📋 Copier le rapport</button>
                    <button className="btn-secondary !py-1.5 !text-xs" onClick={() => maj(e, { note: notes[e.id] ?? e.note ?? '' })}>💾 Enregistrer la note</button>
                    {e.resolu
                      ? <button className="btn-secondary !py-1.5 !text-xs" onClick={() => maj(e, { resolu: false })}>↩ Rouvrir</button>
                      : <button className="btn-success !py-1.5 !text-xs" onClick={() => maj(e, { resolu: true })}>✓ Marquer résolue</button>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {items.length < total && (
        <div className="flex justify-center"><button className="btn-secondary" disabled={chargement} onClick={() => charger(items.length)}>Charger plus</button></div>
      )}
    </div>
  );
}
