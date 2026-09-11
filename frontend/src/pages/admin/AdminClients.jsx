import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatSafeDate } from '../../lib/date';
import api from '../../lib/api';

const moisStr = () => new Date().toISOString().slice(0,7);

const getMoisOptions = () => {
  const opts = [];
  for (let i = 0; i < 24; i++) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    opts.push({ val: d.toISOString().slice(0,7), label: format(d, 'MMMM yyyy', { locale: fr }) });
  }
  return opts;
};
const getAnneeOptions = () => {
  const opts = [];
  for (let i = 0; i < 5; i++) { const y = new Date().getFullYear() - i; opts.push(String(y)); }
  return opts;
};

const TYPE_LABELS = { simple: 'Simple', revendeur: 'Revendeur', fournisseur: 'Fournisseur' };
const TYPE_COLORS = { simple: 'bg-slate-100 text-slate-600', revendeur: 'bg-purple-100 text-purple-700', fournisseur: 'bg-ocean-100 text-ocean-700' };

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [clientSelectionne, setClientSelectionne] = useState(null); // nom sélectionné
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [mois, setMois] = useState(moisStr());
  const [annee, setAnnee] = useState(String(new Date().getFullYear()));
  const [periodes, setPeriodes] = useState([]);
  const [periodeId, setPeriodeId] = useState('');

  useEffect(() => {
    api.get('/clients').then(r => setClients(r.data || [])).catch(console.error).finally(() => setLoading(false));
    api.get('/periodes').then(r => setPeriodes(r.data?.periodes || [])).catch(console.error);
  }, []);

  useEffect(() => {
    if (!clientSelectionne) return;
    setDetailLoading(true);
    const params = new URLSearchParams({ mois, annee });
    if (periodeId) params.append('periode_id', periodeId);
    api.get(`/clients/${encodeURIComponent(clientSelectionne)}?${params}`)
      .then(r => setDetail(r.data))
      .catch(console.error)
      .finally(() => setDetailLoading(false));
  }, [clientSelectionne, mois, annee, periodeId]);

  const clientsFiltres = clients.filter(c => c.nom.includes(recherche.trim().toUpperCase()));

  if (clientSelectionne) {
    return (
      <div className="space-y-5 max-w-3xl">
        <button onClick={() => { setClientSelectionne(null); setDetail(null); }} className="text-sm text-water-600 hover:underline">← Retour à la liste</button>

        {detailLoading && !detail ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-ocean-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : detail && (
          <>
            <div className="card p-5">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <h1 className="text-xl font-bold text-slate-800">{detail.info.nom}</h1>
                  <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[detail.info.type]||TYPE_COLORS.simple}`}>
                    {TYPE_LABELS[detail.info.type]||'Simple'}
                  </span>
                </div>
                <div className="text-right text-sm text-slate-500">
                  <p>📞 {detail.info.telephone || '—'}</p>
                </div>
              </div>
              {detail.info.commentaire && (
                <p className="mt-3 text-sm text-slate-500 italic bg-slate-50 border border-slate-100 rounded-lg p-3">{detail.info.commentaire}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-water-700">{detail.kg_total.toFixed(1)} kg</p>
                <p className="text-xs text-slate-400 mt-0.5">Kg total acheté ({detail.nb_achats} achats)</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-slate-700">{parseInt(detail.montant_total).toLocaleString('fr')} F</p>
                <p className="text-xs text-slate-400 mt-0.5">Montant total versé</p>
              </div>
            </div>

            <div className="card p-4 text-center bg-ocean-50 border border-ocean-100">
              <p className="text-2xl font-bold text-ocean-700">{detail.kg_semaine.toFixed(1)} kg</p>
              <p className="text-xs text-ocean-500 mt-0.5">
                Cette semaine ({formatSafeDate(detail.semaine.debut, 'd MMM', { locale: fr })} → {formatSafeDate(detail.semaine.fin, 'd MMM', { locale: fr })})
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="card p-4 bg-water-50 border border-water-100">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-water-700">Kg du mois</p>
                  <select value={mois} onChange={e => setMois(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white">
                    {getMoisOptions().map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
                  </select>
                </div>
                <p className="text-2xl font-bold text-water-700">{detail.kg_mois.toFixed(1)} kg</p>
              </div>
              <div className="card p-4 bg-purple-50 border border-purple-100">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-purple-700">Kg de l'année</p>
                  <select value={annee} onChange={e => setAnnee(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white">
                    {getAnneeOptions().map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <p className="text-2xl font-bold text-purple-700">{detail.kg_annee.toFixed(1)} kg</p>
              </div>
            </div>

            {periodes.length > 0 && (
              <div className="card p-4 bg-amber-50 border border-amber-100">
                <div className="flex items-center justify-between mb-1 gap-2">
                  <p className="text-xs font-semibold text-amber-700">Kg de la période</p>
                  <select value={periodeId} onChange={e => setPeriodeId(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white">
                    <option value="">Sélectionner une période…</option>
                    {periodes.map(p => <option key={p.id} value={p.id}>{formatSafeDate(p.date_debut,'dd/MM/yyyy')} → {p.date_fin?formatSafeDate(p.date_fin,'dd/MM/yyyy'):'en cours'}</option>)}
                  </select>
                </div>
                <p className="text-2xl font-bold text-amber-700">{periodeId ? `${detail.kg_periode.toFixed(1)} kg` : '—'}</p>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-800">Clients</h1>
      <input type="text" value={recherche} onChange={e => setRecherche(e.target.value)}
        placeholder="Rechercher un client…" className="input" />

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-ocean-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Nom</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Type</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Kg total</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Visites</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Dernière visite</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {clientsFiltres.map(c => (
                <tr key={c.nom} onClick={() => setClientSelectionne(c.nom)} className="hover:bg-slate-50 cursor-pointer">
                  <td className="px-4 py-3 font-medium text-slate-700">{c.nom}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[c.type]||TYPE_COLORS.simple}`}>{TYPE_LABELS[c.type]||'Simple'}</span></td>
                  <td className="px-4 py-3 text-right font-semibold text-water-700">{parseFloat(c.kg_total).toFixed(1)} kg</td>
                  <td className="px-4 py-3 text-right text-slate-500">{c.nb_visites}</td>
                  <td className="px-4 py-3 text-right text-slate-400">{c.derniere_visite ? formatSafeDate(c.derniere_visite, 'd MMM yyyy', { locale: fr }) : '—'}</td>
                </tr>
              ))}
              {clientsFiltres.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400 text-sm">Aucun client trouvé</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
