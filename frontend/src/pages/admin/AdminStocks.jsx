import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../../lib/api';
import { useToast, ToastDisplay } from '../../components/ui/Toast';

const TYPES_POISSONS = ['silure', 'tilapia', 'carpe', 'autre'];
const CATEGORIES_POIDS = ['alevins', '200g', '400g', '500g', '600g', '800g', '1kg+'];
const COULEURS_BAC = ['bg-blue-100 text-blue-700','bg-green-100 text-green-700','bg-purple-100 text-purple-700','bg-amber-100 text-amber-700','bg-red-100 text-red-700','bg-teal-100 text-teal-700','bg-indigo-100 text-indigo-700'];

export default function AdminStocks() {
  const { toast, show } = useToast();
  const [activeTab, setActiveTab] = useState('bacs');
  const [bacsData, setBacsData] = useState(null);
  const [depots, setDepots] = useState([]);
  const [prix, setPrix] = useState([]);
  const [loading, setLoading] = useState(true);

  const [depotForm, setDepotForm] = useState({ quantite_kg:'', type_stock:'silure', poids_categorie:'', bac_numero:'', date_depot:'', note:'' });
  const [depotLoading, setDepotLoading] = useState(false);

  const [prixForm, setPrixForm] = useState({ type_stock:'silure', poids_categorie:'', nouveau_prix:'' });
  const [prixLoading, setPrixLoading] = useState(false);

  const charger = async () => {
    try {
      const [bacsRes, depotsRes, prixRes] = await Promise.all([
        api.get('/stocks/bacs').catch(() => ({ data: { bacs: [], par_type: [], totaux: {} } })),
        api.get('/stocks').catch(() => ({ data: [] })),
        api.get('/stocks/prix').catch(() => ({ data: [] })),
      ]);
      setBacsData(bacsRes.data || { bacs: [], par_type: [], totaux: {} });
      setDepots(Array.isArray(depotsRes.data) ? depotsRes.data : []);
      setPrix(Array.isArray(prixRes.data) ? prixRes.data : []);
    } catch (err) {
      console.error('Erreur chargement stocks:', err);
      setBacsData({ bacs: [], par_type: [], totaux: {} });
      setDepots([]);
      setPrix([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { charger(); }, []);

  const ajouterDepot = async (e) => {
    e.preventDefault();
    setDepotLoading(true);
    try {
      await api.post('/stocks', depotForm);
      setDepotForm({ quantite_kg:'', type_stock:'silure', poids_categorie:'', bac_numero:'', date_depot:'', note:'' });
      await charger();
      show('Dépôt enregistré ✓', 'success');
    } catch (err) { show(err.response?.data?.message || 'Erreur', 'error'); }
    finally { setDepotLoading(false); }
  };

  const modifierPrix = async (e) => {
    e.preventDefault();
    setPrixLoading(true);
    try {
      const res = await api.post('/stocks/prix', prixForm);
      await charger();
      setPrixForm({ type_stock:'silure', poids_categorie:'', nouveau_prix:'' });
      show(res.data.message, 'success');
    } catch (err) { show(err.response?.data?.message || 'Erreur', 'error'); }
    finally { setPrixLoading(false); }
  };

  const supprimerDepot = async (id) => {
    if (!confirm('Supprimer ce dépôt ?')) return;
    try { await api.delete(`/stocks/${id}`); await charger(); show('Dépôt supprimé', 'success'); }
    catch { show('Erreur', 'error'); }
  };

  const totaux = bacsData?.totaux || {};
  const prixCourant = (type, cat) => {
    const p = prix.find(p => p.type_stock === type && p.poids_categorie === (cat || null));
    return p?.prix_par_kg || 2500;
  };

  // Regrouper les bacs par numéro
  const bacsParNum = {};
  (bacsData?.bacs || []).forEach(b => {
    if (!bacsParNum[b.bac_numero]) bacsParNum[b.bac_numero] = [];
    bacsParNum[b.bac_numero].push(b);
  });

  return (
    <div className="max-w-4xl space-y-5">
      <ToastDisplay toast={toast} />

      <div>
        <h1 className="text-2xl font-bold text-slate-800">Stocks & Bacs</h1>
        <p className="text-sm text-slate-500">Gestion des 7 bacs de stockage</p>
      </div>

      {/* Totaux */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label:'Kg achetés total', value:`${parseFloat(totaux.total_kg_achete||0).toFixed(1)} kg`, cls:'text-ocean-700 bg-ocean-50' },
          { label:'Kg vendus total', value:`${parseFloat(totaux.total_kg_vendu||0).toFixed(1)} kg`, cls:'text-water-700 bg-water-50' },
          { label:'Kg en stock', value:`${parseFloat(totaux.reste_kg||0).toFixed(1)} kg`, cls: parseFloat(totaux.reste_kg||0)<20 ? 'text-red-700 bg-red-50':'text-green-700 bg-green-50' },
          { label:'Valeur totale achat', value:`${parseInt(totaux.valeur_totale_achat||0).toLocaleString('fr')} F`, cls:'text-slate-700 bg-slate-50' },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.cls}`}>
            <p className="text-xs opacity-70 mb-1">{s.label}</p>
            <p className="text-xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white">
        {[
          { id:'bacs', label:'🐟 Vue par bacs' },
          { id:'depot', label:'📦 Nouveau dépôt' },
          { id:'historique', label:'📋 Historique' },
          { id:'prix', label:'💰 Prix' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-xs font-medium transition ${activeTab === tab.id ? 'bg-ocean-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── VUE BACS ─── */}
      {activeTab === 'bacs' && (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6,7].map(numBac => {
              const contenu = bacsParNum[numBac] || [];
              const totalKgBac = contenu.reduce((s, b) => s + parseFloat(b.kg_total||0), 0);
              const cls = COULEURS_BAC[numBac-1];
              return (
                <div key={numBac} className="card overflow-hidden">
                  <div className={`px-4 py-2.5 flex items-center justify-between ${cls}`}>
                    <span className="font-bold text-sm">Bac {numBac}</span>
                    <span className="text-xs font-medium">{totalKgBac.toFixed(1)} kg</span>
                  </div>
                  <div className="p-3 space-y-2 min-h-[60px]">
                    {contenu.length === 0
                      ? <p className="text-xs text-slate-400 italic text-center py-2">Bac vide</p>
                      : contenu.map((b, i) => (
                        <div key={i} className="flex justify-between items-center text-xs">
                          <div>
                            <span className="font-medium text-slate-700">{b.type_stock}</span>
                            {b.poids_categorie && <span className="text-slate-400 ml-1">· {b.poids_categorie}</span>}
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-700">{parseFloat(b.kg_total).toFixed(1)} kg</span>
                            <p className="text-slate-400">{parseInt(b.dernier_prix).toLocaleString('fr')} F/kg</p>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                  {contenu.length > 0 && (
                    <div className="px-3 pb-2 text-xs text-slate-400">
                      Dernier dépôt : {contenu[0]?.dernier_depot ? format(new Date(contenu[0].dernier_depot+'T12:00:00'), 'd MMM', { locale: fr }) : '—'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Résumé par type */}
          {bacsData?.par_type?.length > 0 && (
            <div className="card overflow-hidden mt-4">
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-600">Résumé par type de poisson</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50"><tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Catégorie</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500">Kg achetés</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500">Prix/kg</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {bacsData.par_type.map((t, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-700 capitalize">{t.type_stock}</td>
                      <td className="px-4 py-2.5 text-slate-500">{t.poids_categorie || '—'}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{parseFloat(t.total_achete).toFixed(1)} kg</td>
                      <td className="px-4 py-2.5 text-right text-slate-500">{parseInt(t.dernier_prix||0).toLocaleString('fr')} F</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── NOUVEAU DÉPÔT ─── */}
      {activeTab === 'depot' && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">📦 Enregistrer un nouveau dépôt</h2>
          <form onSubmit={ajouterDepot} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Type de poisson *</label>
                <select value={depotForm.type_stock} onChange={e => setDepotForm({...depotForm, type_stock: e.target.value})} className="input">
                  {TYPES_POISSONS.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Catégorie de poids</label>
                <select value={depotForm.poids_categorie} onChange={e => setDepotForm({...depotForm, poids_categorie: e.target.value})} className="input">
                  <option value="">— Sélectionner —</option>
                  {CATEGORIES_POIDS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Bac n° (1 à 7)</label>
                <select value={depotForm.bac_numero} onChange={e => setDepotForm({...depotForm, bac_numero: e.target.value})} className="input">
                  <option value="">— Aucun bac —</option>
                  {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>Bac {n}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Quantité (kg) *</label>
                <input type="number" step="0.1" min="0.1" required value={depotForm.quantite_kg}
                  onChange={e => setDepotForm({...depotForm, quantite_kg: e.target.value})} className="input" placeholder="Ex: 150" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Date du dépôt</label>
                <input type="date" value={depotForm.date_depot}
                  onChange={e => setDepotForm({...depotForm, date_depot: e.target.value})} className="input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Note</label>
                <input type="text" value={depotForm.note} onChange={e => setDepotForm({...depotForm, note: e.target.value})} className="input" placeholder="Optionnel" />
              </div>
            </div>
            {depotForm.quantite_kg && depotForm.type_stock && (
              <div className="px-3 py-2.5 bg-ocean-50 rounded-lg text-sm text-ocean-700">
                Prix courant : <strong>{prixCourant(depotForm.type_stock, depotForm.poids_categorie).toLocaleString('fr')} FCFA/kg</strong>
                {' · '}Valeur estimée : <strong>{(parseFloat(depotForm.quantite_kg) * prixCourant(depotForm.type_stock, depotForm.poids_categorie)).toLocaleString('fr')} FCFA</strong>
              </div>
            )}
            <button type="submit" disabled={depotLoading} className="btn-primary">
              {depotLoading ? 'Enregistrement…' : '+ Enregistrer ce dépôt'}
            </button>
          </form>
        </div>
      )}

      {/* ─── HISTORIQUE ─── */}
      {activeTab === 'historique' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50"><tr>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Date</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Type</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Catégorie</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500">Bac</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500">Kg</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500">Valeur</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Note</th>
                <th className="px-2 py-2.5"></th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {depots.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 text-slate-600 text-xs">{format(new Date(d.date_depot+'T12:00:00'), 'd MMM yy', { locale: fr })}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-700 capitalize">{d.type_stock}</td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs">{d.poids_categorie || '—'}</td>
                    <td className="px-3 py-2.5 text-center">
                      {d.bac_numero ? <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${COULEURS_BAC[d.bac_numero-1]}`}>B{d.bac_numero}</span> : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium">{parseFloat(d.quantite_kg).toFixed(1)}</td>
                    <td className="px-3 py-2.5 text-right text-water-700 text-xs font-semibold">{parseInt(d.valeur_totale||0).toLocaleString('fr')} F</td>
                    <td className="px-3 py-2.5 text-slate-400 text-xs italic">{d.note || '—'}</td>
                    <td className="px-2 py-2.5">
                      <button onClick={() => supprimerDepot(d.id)} className="text-slate-300 hover:text-red-500 transition text-xs">✕</button>
                    </td>
                  </tr>
                ))}
                {depots.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-slate-400 text-sm">Aucun dépôt.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── PRIX ─── */}
      {activeTab === 'prix' && (
        <div className="space-y-4" key="tab-prix">
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-1">Modifier le prix d'un type de stock</h2>
            <p className="text-xs text-slate-400 mb-4">⚠️ La modification n'affecte pas les dépôts passés. Seuls les nouveaux dépôts utiliseront le nouveau prix.</p>
            <form onSubmit={modifierPrix} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Type de poisson *</label>
                  <select value={prixForm.type_stock} onChange={e => setPrixForm({...prixForm, type_stock: e.target.value})} className="input">
                    {TYPES_POISSONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Catégorie</label>
                  <select value={prixForm.poids_categorie} onChange={e => setPrixForm({...prixForm, poids_categorie: e.target.value})} className="input">
                    <option value="">Toutes catégories</option>
                    {CATEGORIES_POIDS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Nouveau prix (FCFA/kg) *</label>
                  <input type="number" min="1" required value={prixForm.nouveau_prix}
                    onChange={e => setPrixForm({...prixForm, nouveau_prix: e.target.value})} className="input" placeholder="Ex: 3000" />
                </div>
              </div>
              <button type="submit" disabled={prixLoading} className="btn-primary">{prixLoading ? 'Mise à jour…' : 'Mettre à jour le prix'}</button>
            </form>
          </div>

          {/* Grille prix actuels */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100"><h3 className="text-sm font-semibold text-slate-600">Prix actuellement en vigueur</h3></div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50"><tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Type</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Catégorie</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500">Prix/kg</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Depuis</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {(!prix || prix.length === 0) ? (
                  <tr><td colSpan={4} className="text-center py-6 text-slate-400 text-sm">
                    Aucun prix configuré — exécutez le script SQL d'initialisation dans Neon.
                  </td></tr>
                ) : prix.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-700 capitalize">{p?.type_stock || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-500">{p?.poids_categorie || 'Toutes'}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-water-700">{parseInt(p?.prix_par_kg || 0).toLocaleString('fr')} FCFA</td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs">
                      {p?.date_debut ? (() => { try { return format(new Date(p.date_debut+'T12:00:00'), 'd MMM yyyy', { locale: fr }); } catch { return '—'; } })() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
