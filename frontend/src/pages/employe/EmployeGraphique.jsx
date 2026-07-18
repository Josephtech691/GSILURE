import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { useToast, ToastDisplay } from '../../components/ui/Toast';

const moisOptions = () => {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({
      val: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
      label: format(d, 'MMMM yyyy', { locale: fr }),
    });
  }
  return opts;
};

const fmtK = (v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v);

export default function EmployeGraphique() {
  const { toast, show } = useToast();
  const [mois, setMois] = useState(() => new Date().toISOString().slice(0,7));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [typeChart, setTypeChart] = useState('bar');

  // Formulaire mouvement caisse
  const [showMouvement, setShowMouvement] = useState(false);
  const [mvForm, setMvForm] = useState({ type: 'ajout', montant: '', commentaire: '', mois: '' });
  const [mvLoading, setMvLoading] = useState(false);

  // Formulaire encaissement (versement au patron)
  const [showEncaissement, setShowEncaissement] = useState(false);
  const [encForm, setEncForm] = useState({ montant: '', commentaire: '' });
  const [encLoading, setEncLoading] = useState(false);

  const charger = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/ventes/graphique?mois=${mois}`);
      setData(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { charger(); }, [mois]);

  const soumettreMouvement = async (e) => {
    e.preventDefault();
    if (!mvForm.montant || !mvForm.commentaire.trim()) return;
    setMvLoading(true);
    try {
      await api.post('/ventes/mouvements-caisse', { ...mvForm, mois });
      const socket = getSocket();
      socket?.connected && socket.emit('demande-soumise', {
        type: 'mouvement_caisse',
        message: `${mvForm.type === 'ajout' ? '➕' : '➖'} Mouvement de caisse : ${parseFloat(mvForm.montant).toLocaleString('fr')} FCFA — ${mvForm.commentaire}`,
      });
      setShowMouvement(false);
      setMvForm({ type: 'ajout', montant: '', commentaire: '', mois: '' });
      show('Demande de mouvement envoyée au patron ✓', 'success');
    } catch (err) { show(err.response?.data?.message || 'Erreur', 'error'); }
    finally { setMvLoading(false); }
  };

  const soumettreEncaissement = async (e) => {
    e.preventDefault();
    if (!encForm.montant) return;
    setEncLoading(true);
    try {
      await api.post('/ventes/encaissements', { ...encForm, mois });
      const socket = getSocket();
      socket?.connected && socket.emit('demande-soumise', {
        type: 'encaissement',
        message: `💰 Versement de ${parseFloat(encForm.montant).toLocaleString('fr')} FCFA pour ${mois}`,
      });
      setShowEncaissement(false);
      setEncForm({ montant: '', commentaire: '' });
      show('Versement soumis pour approbation ✓', 'success');
      charger();
    } catch (err) { show(err.response?.data?.message || 'Erreur', 'error'); }
    finally { setEncLoading(false); }
  };

  const donnees = (data?.donnees || []).map(d => ({
    ...d,
    jour: format(new Date(d.date+'T12:00:00'), 'd MMM', { locale: fr }),
    kg_vendus: parseFloat(d.kg_vendus),
    montant_encaisse: parseFloat(d.montant_encaisse),
  }));

  const t = data?.totaux_mois || {};
  const stockGlobal = data?.stock_global || {};
  const totalKgAchete = stockGlobal.total_kg_achete || 0;
  const totalKgVendu = stockGlobal.total_kg_vendu || 0;
  const resteKg = totalKgAchete - totalKgVendu;

  const Chart = typeChart === 'bar' ? BarChart : LineChart;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <ToastDisplay toast={toast} />

      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Mes performances</h1>
          <p className="text-sm text-slate-500">Évolution mensuelle de vos ventes</p>
        </div>
        <div className="flex gap-2">
          <select value={mois} onChange={e => setMois(e.target.value)} className="input w-auto text-sm">
            {moisOptions().map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
          </select>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            {['bar','line'].map(t => (
              <button key={t} onClick={() => setTypeChart(t)}
                className={`px-3 py-2 text-xs font-medium transition ${typeChart === t ? 'bg-ocean-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                {t === 'bar' ? '📊' : '📈'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-ocean-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* Graphique Kg */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-600 mb-3">Kg vendus par jour</h3>
            {donnees.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">Aucune vente ce mois-ci</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <Chart data={donnees}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="jour" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} unit=" kg" />
                  <Tooltip formatter={v => [`${parseFloat(v).toFixed(1)} kg`, 'Kg']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  {typeChart === 'bar'
                    ? <Bar dataKey="kg_vendus" fill="#1a78ed" radius={[4,4,0,0]} />
                    : <Line type="monotone" dataKey="kg_vendus" stroke="#1a78ed" strokeWidth={2} dot={{ r: 3 }} />}
                </Chart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Graphique Montants */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-600 mb-3">Montant encaissé (FCFA)</h3>
            {donnees.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">Aucune vente ce mois-ci</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <Chart data={donnees}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="jour" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtK} />
                  <Tooltip formatter={v => [`${parseInt(v).toLocaleString('fr')} FCFA`, 'Encaissé']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  {typeChart === 'bar'
                    ? <Bar dataKey="montant_encaisse" fill="#0d937c" radius={[4,4,0,0]} />
                    : <Line type="monotone" dataKey="montant_encaisse" stroke="#0d937c" strokeWidth={2} dot={{ r: 3 }} />}
                </Chart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Résumé mois */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-600 mb-4">Résumé — {moisOptions().find(o => o.val === mois)?.label}</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: 'Kg vendus', value: `${(t.kg_total||0).toFixed(1)} kg`, color: 'text-ocean-700' },
                { label: 'Encaissé ventes', value: `${parseInt(t.montant_total||0).toLocaleString('fr')} F`, color: 'text-water-700' },
                { label: 'Ajouts caisse approuvés', value: `+${parseInt(t.ajouts||0).toLocaleString('fr')} F`, color: 'text-green-700' },
                { label: 'Retraits caisse approuvés', value: `-${parseInt(t.retraits||0).toLocaleString('fr')} F`, color: 'text-red-600' },
                { label: 'Versé au patron', value: `${parseInt(t.encaissements||0).toLocaleString('fr')} F`, color: 'text-purple-700' },
                { label: 'Reste à verser', value: `${Math.max(0, parseInt((t.kg_total||0)*2500 - (t.montant_total||0) - (t.encaissements||0))).toLocaleString('fr')} F`, color: 'text-amber-700' },
              ].map(s => (
                <div key={s.label} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-0.5">{s.label}</p>
                  <p className={`font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Demandes en attente */}
            {data?.en_attente?.length > 0 && (
              <div className="mt-3 px-3 py-2 bg-amber-50 rounded-lg">
                <p className="text-xs font-medium text-amber-700 mb-1">⏳ En attente d'approbation :</p>
                {data.en_attente.map(ea => (
                  <p key={ea.type} className="text-xs text-amber-600">
                    {ea.type === 'ajout' ? '+' : '-'} {parseInt(ea.total).toLocaleString('fr')} FCFA ({ea.type})
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Stock global (lecture seule pour l'employé) */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-600 mb-4">🐟 État du stock global</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 bg-ocean-50 rounded-lg">
                <p className="text-xl font-bold text-ocean-700">{totalKgAchete.toFixed(1)}</p>
                <p className="text-xs text-slate-400 mt-0.5">kg achetés</p>
              </div>
              <div className="text-center p-3 bg-water-50 rounded-lg">
                <p className="text-xl font-bold text-water-700">{totalKgVendu.toFixed(1)}</p>
                <p className="text-xs text-slate-400 mt-0.5">kg vendus</p>
              </div>
              <div className={`text-center p-3 rounded-lg ${resteKg < 20 ? 'bg-red-50' : 'bg-green-50'}`}>
                <p className={`text-xl font-bold ${resteKg < 20 ? 'text-red-600' : 'text-green-700'}`}>{resteKg.toFixed(1)}</p>
                <p className="text-xs text-slate-400 mt-0.5">kg restants</p>
              </div>
            </div>

            {/* Détail par type/bac */}
            {stockGlobal.par_type?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Détail par type</p>
                {stockGlobal.par_type.map((s, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg text-sm">
                    <span className="text-slate-600">
                      {s.bac_numero && <span className="font-mono text-xs bg-ocean-100 text-ocean-700 px-1.5 py-0.5 rounded mr-2">Bac {s.bac_numero}</span>}
                      {s.type_stock} {s.poids_categorie && `· ${s.poids_categorie}`}
                    </span>
                    <span className="font-semibold text-slate-700">{parseFloat(s.total_kg).toFixed(1)} kg</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── MOUVEMENTS CAISSE ─── */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">💼 Ajustements de caisse</h3>
              <p className="text-xs text-slate-400 mt-0.5">Signalez un surplus ou un manque d'argent — soumis pour approbation du patron</p>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <button onClick={() => { setMvForm({...mvForm, type: 'ajout'}); setShowMouvement(true); }}
                className="flex flex-col items-center gap-1 p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl transition">
                <span className="text-2xl">➕</span>
                <span className="text-sm font-semibold text-green-700">Argent en plus</span>
                <span className="text-xs text-green-500">Surplus à déclarer</span>
              </button>
              <button onClick={() => { setMvForm({...mvForm, type: 'retrait'}); setShowMouvement(true); }}
                className="flex flex-col items-center gap-1 p-4 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition">
                <span className="text-2xl">➖</span>
                <span className="text-sm font-semibold text-red-700">Argent en moins</span>
                <span className="text-xs text-red-500">Manque à expliquer</span>
              </button>
            </div>

            {showMouvement && (
              <form onSubmit={soumettreMouvement} className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-4">
                <div className="flex gap-2">
                  {['ajout','retrait'].map(t => (
                    <button key={t} type="button" onClick={() => setMvForm({...mvForm, type: t})}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${mvForm.type === t
                        ? t === 'ajout' ? 'bg-green-600 text-white border-green-600' : 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-slate-600 border-slate-200'}`}>
                      {t === 'ajout' ? '➕ Argent en plus' : '➖ Argent en moins'}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Montant (FCFA) *</label>
                  <input type="number" min="1" required value={mvForm.montant} onChange={e => setMvForm({...mvForm, montant: e.target.value})} className="input" placeholder="Ex: 5000" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Justification (obligatoire) *</label>
                  <textarea value={mvForm.commentaire} onChange={e => setMvForm({...mvForm, commentaire: e.target.value})}
                    placeholder={mvForm.type === 'ajout' ? 'Ex: Pourboire reçu du client 3…' : 'Ex: Erreur de rendu monnaie client 2…'}
                    rows={2} className="input resize-none" required />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={mvLoading} className={`flex-1 py-2 text-sm font-medium rounded-lg text-white transition ${mvForm.type === 'ajout' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                    {mvLoading ? 'Envoi…' : 'Soumettre au patron'}
                  </button>
                  <button type="button" onClick={() => setShowMouvement(false)} className="btn-secondary text-sm py-2">Annuler</button>
                </div>
              </form>
            )}

            {/* Historique mouvements */}
            {data?.mouvements?.length > 0 && (
              <div className="border-t border-slate-100 px-4 py-3">
                <p className="text-xs font-medium text-slate-500 mb-2">Approuvés ce mois</p>
                {data.mouvements.map(m => (
                  <div key={m.id} className="flex justify-between items-center py-1.5 text-sm">
                    <span className="text-slate-600 truncate flex-1 text-xs">{m.commentaire}</span>
                    <span className={`font-bold text-xs ml-2 ${m.type === 'ajout' ? 'text-green-600' : 'text-red-600'}`}>
                      {m.type === 'ajout' ? '+' : '-'}{parseInt(m.montant).toLocaleString('fr')} F
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── ENCAISSEMENT / VERSEMENT AU PATRON ─── */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">💰 Déclarer un versement au patron</h3>
            <p className="text-xs text-slate-400 mb-4">Montant d'argent soldé à remettre au patron — sera approuvé et déduit de votre caisse</p>

            {!showEncaissement ? (
              <button onClick={() => setShowEncaissement(true)} className="btn-primary w-full justify-center">
                + Déclarer un versement
              </button>
            ) : (
              <form onSubmit={soumettreEncaissement} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Montant à verser (FCFA) *</label>
                  <input type="number" min="1" required value={encForm.montant} onChange={e => setEncForm({...encForm, montant: e.target.value})} className="input" placeholder="Ex: 50000" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Note (optionnel)</label>
                  <input type="text" value={encForm.commentaire} onChange={e => setEncForm({...encForm, commentaire: e.target.value})} className="input" placeholder="Ex: Versement semaine du 12 au 18" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={encLoading} className="btn-success flex-1 justify-center">{encLoading ? 'Envoi…' : '✓ Soumettre'}</button>
                  <button type="button" onClick={() => setShowEncaissement(false)} className="btn-secondary">Annuler</button>
                </div>
              </form>
            )}

            {/* Historique encaissements */}
            {data?.encaissements?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                <p className="text-xs font-medium text-slate-500">Versements approuvés ce mois</p>
                {data.encaissements.map(e => (
                  <div key={e.id} className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 text-xs">{e.commentaire || format(new Date(e.created_at), 'd MMM', { locale: fr })}</span>
                    <span className="font-bold text-purple-700 text-xs">{parseInt(e.montant).toLocaleString('fr')} FCFA</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
