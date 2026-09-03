import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { formatSafeDate } from '../../lib/date';
import { fr } from 'date-fns/locale';
import api from '../../lib/api';
import Chat from '../../components/chat/Chat';
import Avatar from '../../components/ui/Avatar';

const todayStr = () => new Date().toISOString().split('T')[0];
const moisStr  = () => new Date().toISOString().slice(0,7);

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
  for (let i = 0; i < 5; i++) {
    const y = new Date().getFullYear() - i;
    opts.push({ val: String(y), label: String(y) });
  }
  return opts;
};

function StatCard({ label, value, sub, color='slate', icon }) {
  const cls = {
    ocean:'bg-ocean-50 text-ocean-700 border-ocean-100',
    water:'bg-water-50 text-water-700 border-water-100',
    amber:'bg-amber-50 text-amber-700 border-amber-100',
    red:'bg-red-50 text-red-700 border-red-100',
    purple:'bg-purple-50 text-purple-700 border-purple-100',
    orange:'bg-orange-50 text-orange-700 border-orange-100',
    slate:'bg-slate-50 text-slate-700 border-slate-100',
  };
  return (
    <div className={`stat-card border ${cls[color]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium opacity-70 mb-1 truncate">{label}</p>
          <p className="text-xl font-bold truncate">{value}</p>
          {sub && <p className="text-xs opacity-60 mt-0.5 truncate">{sub}</p>}
        </div>
        {icon && <span className="text-xl opacity-60 ml-2 shrink-0">{icon}</span>}
      </div>
    </div>
  );
}

// Composant sélecteur de mois/année inline
function MoisSelect({ value, onChange, label }) {
  const opts = getMoisOptions();
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-ocean-400">
      {opts.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
    </select>
  );
}

function AnneeSelect({ value, onChange }) {
  const opts = getAnneeOptions();
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-ocean-400">
      {opts.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
    </select>
  );
}

export default function AdminDashboard() {
  const [date, setDate] = useState(todayStr());
  const [employes, setEmployes] = useState([]);
  const [filtreEmploye, setFiltreEmploye] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Gestion du mode période
  const [periodes, setPeriodes] = useState([]);
  const [periodeActive, setPeriodeActive] = useState(false);
  const [periodeSelectionnee, setPeriodeSelectionnee] = useState(null);
  const [chargementPeriodes, setChargementPeriodes] = useState(true);

  // Filtres indépendants pour chaque section
  const [moisRevenus, setMoisRevenus]       = useState(moisStr());
  const [anneeRevenus, setAnneeRevenus]     = useState(String(new Date().getFullYear()));
  const [filtreStock, setFiltreStock]       = useState('');
  const [stockTypes, setStockTypes]         = useState([]);
  const [revenus, setRevenus]               = useState(null);

  const [moisRetire, setMoisRetire]         = useState(moisStr());
  const [anneeRetire, setAnneeRetire]       = useState(String(new Date().getFullYear()));
  const [dataRetire, setDataRetire]         = useState(null);

  const [moisVentes, setMoisVentes]         = useState(moisStr());
  const [ventesJour, setVentesJour]         = useState([]);

  // Pertes
  const [moisPertes, setMoisPertes]         = useState(moisStr());
  const [anneePertes, setAnneePertes]       = useState(String(new Date().getFullYear()));
  const [statsPertes, setStatsPertes]       = useState(null);
  const [moisRestes, setMoisRestes]         = useState(moisStr());
  const [anneeRestes, setAnneeRestes]       = useState(String(new Date().getFullYear()));
  const [statsRestes, setStatsRestes]       = useState(null);

  // Configuration globale des périodes
  const chargerPeriodes = async () => {
    setChargementPeriodes(true);
    try {
      const r = await api.get('/periodes');
      setPeriodes(r.data?.periodes || []);
      setPeriodeActive(Boolean(r.data?.periode_active));
      setPeriodeSelectionnee(r.data?.periode || null);
    } catch (err) {
      console.error('Chargement périodes:', err);
    } finally {
      setChargementPeriodes(false);
    }
  };

  useEffect(() => { chargerPeriodes(); }, []);

  const basculerPeriode = async () => {
    try {
      const r = await api.patch('/periodes/toggle', { active: !periodeActive });
      setPeriodeActive(Boolean(r.data?.periode_active));
      if (r.data?.periode) setPeriodeSelectionnee(r.data.periode);
      await chargerPeriodes();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Impossible de modifier le mode période.');
    }
  };

  const selectionnerPeriode = async (id) => {
    if (!id) return;
    try {
      const r = await api.patch(`/periodes/${id}/selectionner`);
      setPeriodeActive(true);
      setPeriodeSelectionnee(r.data?.periode || periodes.find(p => String(p.id) === String(id)) || null);
      await chargerPeriodes();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Impossible de sélectionner cette période.');
    }
  };

  const periodeId = periodeActive ? periodeSelectionnee?.id : null;

  // Chargement dashboard journée
  useEffect(() => {
    api.get('/auth/employes').then(r => setEmployes(r.data)).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ date });
    if (periodeId) params.append('periode_id', periodeId);
    if (filtreEmploye) params.append('employe_id', filtreEmploye);
    api.get(`/ventes/dashboard?${params}`)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [date, filtreEmploye, periodeId]);

  // Types de stock
  useEffect(() => {
    api.get('/stocks/prix').then(r => {
      const types = [...new Set((r.data||[]).map(p => p.type_stock))];
      setStockTypes(types);
    }).catch(console.error);
  }, []);

  // Revenus — rechargé quand mois/année/filtreStock change
  useEffect(() => {
    const params = new URLSearchParams({ mois: moisRevenus, annee: anneeRevenus });
    if (periodeId) params.append('periode_id', periodeId);
    if (filtreStock) params.append('type_stock', filtreStock);
    api.get(`/ventes/revenus?${params}`)
      .then(r => setRevenus(r.data))
      .catch(console.error);
  }, [moisRevenus, anneeRevenus, filtreStock, periodeId]);

  // Argent retiré — rechargé quand moisRetire/anneeRetire change
  useEffect(() => {
    const params = new URLSearchParams({ mois: moisRetire, annee: anneeRetire, date });
    if (periodeId) params.append('periode_id', periodeId);
    api.get(`/ventes/dashboard?${params}`)
      .then(r => setDataRetire(r.data))
      .catch(console.error);
  }, [moisRetire, anneeRetire, date, periodeId]);

  // Ventes journalières — rechargé quand moisVentes change
  useEffect(() => {
    const params = new URLSearchParams({ mois: moisVentes });
    if (periodeId) params.append('periode_id', periodeId);
    api.get(`/ventes/journalier?${params}`)
      .then(r => setVentesJour(Array.isArray(r.data) ? r.data : []))
      .catch(console.error);
  }, [moisVentes, periodeId]);

  // Stats pertes — rechargé quand moisPertes/anneePertes change
  useEffect(() => {
    const params = new URLSearchParams({ mois: moisPertes, annee: anneePertes });
    if (periodeId) params.append('periode_id', periodeId);
    api.get(`/pertes/stats?${params}`)
      .then(r => setStatsPertes(r.data))
      .catch(console.error);
  }, [moisPertes, anneePertes, periodeId]);

  // Stats restes — rechargé quand moisRestes/anneeRestes change
  useEffect(() => {
    const params = new URLSearchParams({ mois: moisRestes, annee: anneeRestes });
    if (periodeId) params.append('periode_id', periodeId);
    api.get(`/ventes/restes/stats?${params}`)
      .then(r => setStatsRestes(r.data))
      .catch(console.error);
  }, [moisRestes, anneeRestes, periodeId]);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-ocean-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const t    = data?.totaux_jour    || {};
  const stock = data?.stock         || {};
  const casse = data?.casse_employes || [];

  // Calcul argent retiré depuis dataRetire
  const retireMois  = dataRetire || data;
  const ccMois = retireMois?.caisse_cumulee || {};
  const mmMois = retireMois?.totaux_mois    || {};
  const argentRetireMois  = parseInt(mmMois.retraits||0) + parseInt(mmMois.encaissements||0);

  const retireAnnee = dataRetire || data;
  const ccAnnee = retireAnnee?.caisse_cumulee || {};
  const argentRetireAnnee = parseInt(ccAnnee.retraits||0) + parseInt(ccAnnee.encaissements||0);

  const moisOptions = getMoisOptions();

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-800">Tableau de bord</h1>

      {/* ═══ MODE PÉRIODE ═══ */}
      <div className={`card p-4 border-l-4 ${periodeActive ? 'border-water-500 bg-water-50/40' : 'border-slate-300 bg-slate-50'}`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-slate-700">📅 Période du tableau de bord</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {periodeActive && periodeSelectionnee
                ? `Données calculées du ${formatSafeDate(periodeSelectionnee.date_debut, 'd MMM yyyy', { locale: fr })} au ${periodeSelectionnee.date_fin ? formatSafeDate(periodeSelectionnee.date_fin, 'd MMM yyyy', { locale: fr }) : "aujourd'hui"}.`
                : 'Mode période désactivé : le dashboard conserve son affichage global actuel.'}
            </p>
          </div>
          <button onClick={basculerPeriode} disabled={chargementPeriodes || !periodeSelectionnee}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${periodeActive ? 'bg-white border-amber-200 text-amber-700 hover:bg-amber-50' : 'bg-water-600 border-water-600 text-white hover:bg-water-700'}`}>
            {periodeActive ? '⏸ Désactiver la période' : '▶ Activer la période'}
          </button>
        </div>

        {periodeActive && (
          <div className="mt-3 pt-3 border-t border-slate-200/70 flex items-center gap-3 flex-wrap">
            <label className="text-xs font-semibold text-slate-600">Période affichée :</label>
            <select value={periodeSelectionnee?.id || ''} onChange={e => selectionnerPeriode(e.target.value)}
              className="input w-auto text-sm bg-white">
              {periodes.map(p => (
                <option key={p.id} value={p.id}>
                  {formatSafeDate(p.date_debut, 'dd/MM/yyyy')} → {p.date_fin ? formatSafeDate(p.date_fin, 'dd/MM/yyyy') : 'en cours'}
                  {/*{p.commentaire ? ` — ${p.commentaire}` : ''}*/}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ═══ STOCK ═══ */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-600 mb-4">📦 État du stock global</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-700">{parseFloat(stock.total_kg_achete||0).toFixed(1)}</p>
            <p className="text-xs text-slate-400 mt-0.5">kg deposer </p>
          </div>
          <div className="text-center border-x border-slate-100">
            <p className="text-2xl font-bold text-ocean-700">{parseFloat(stock.total_kg_vendu||0).toFixed(1)}</p>
            <p className="text-xs text-slate-400 mt-0.5">kg vendus</p>
          </div>
          <div className={`text-center ${parseFloat(stock.reste_kg||0)<20?'text-red-600':'text-water-700'}`}>
            <p className="text-2xl font-bold">{parseFloat(stock.reste_kg||0).toFixed(1)}</p>
            <p className="text-xs text-slate-400 mt-0.5">kg restants</p>
          </div>
        </div>
        {parseFloat(stock.total_kg_achete||0)>0 && (
          <div className="mt-4">
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-water-500 rounded-full"
                style={{width:`${Math.max(0,Math.min(100,(parseFloat(stock.reste_kg||0)/parseFloat(stock.total_kg_achete||1))*100))}%`}} />
            </div>
            <p className="text-xs text-slate-400 mt-1 text-right">
              {((parseFloat(stock.reste_kg||0)/parseFloat(stock.total_kg_achete||1))*100).toFixed(1)}% restant
            </p>
          </div>
        )}
      </div>

      
      {/* ═══ FILTRES JOURNÉE ═══ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-slate-500">{formatSafeDate(date, 'EEEE d MMMM yyyy', { locale: fr })}</p>
        <div className="flex flex-wrap gap-2">
          <select value={filtreEmploye} onChange={e => setFiltreEmploye(e.target.value)} className="input w-auto text-sm">
            <option value="">Tous les employés</option>
            {employes.map(e => <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}
          </select>
          <input type="date" value={date} max={todayStr()} onChange={e => setDate(e.target.value)} className="input w-auto text-sm" />
        </div>
      </div>

      {/* ═══ STATS DU JOUR ═══ */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Journée du {formatSafeDate(date, 'd MMM', { locale: fr })}
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon="⚖️" label="Kg vendus" value={`${(t.kg_vendus||0).toFixed(1)} kg`} color="ocean" />
          <StatCard icon="💵" label="CA encaissé" value={`${parseInt(t.ca_total||0).toLocaleString('fr')} F`} color="water" />
          <StatCard icon="👥" label="Clients" value={t.nb_clients||0} color="slate" />
          <StatCard icon="⚠️" label="Reste à percevoir" value={`${parseInt((t.kg_vendus||0)*2500-(t.ca_total||0)).toLocaleString('fr')} F`} color="amber" />
        </div>
      </div>

      {/* ═══ STATS PAR EMPLOYÉ ═══ */}
      {/*
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-600">👥 Par employé — {formatSafeDate(date, 'd MMMM', { locale: fr })}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Employé</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Kg vendus</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Encaissé</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Clients</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Reste</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {(data?.stats_par_employe||[]).map(emp => (
                <tr key={emp.employe_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-700">{emp.employe_nom}</td>
                  <td className="px-4 py-3 text-right">{parseFloat(emp.kg_vendus_jour||0).toFixed(1)} kg</td>
                  <td className="px-4 py-3 text-right text-water-700 font-medium">{parseInt(emp.ca_jour||0).toLocaleString('fr')} F</td>
                  <td className="px-4 py-3 text-right text-slate-500">{emp.nb_clients}</td>
                  <td className={`px-4 py-3 text-right font-medium ${parseInt(emp.kg_vendus_jour||0)*2500-parseInt(emp.ca_jour||0)>0?'text-red-600':'text-green-600'}`}>
                    {(parseInt(emp.kg_vendus_jour||0)*2500-parseInt(emp.ca_jour||0)).toLocaleString('fr')} F
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div> */}

      {/* ═══ CLIENTS DU JOUR ═══ */}
      {(data?.clients_du_jour||[]).length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-600">🛒 Clients du {formatSafeDate(date, 'd MMMM', { locale: fr })}</h2>
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{data.clients_du_jour.length} client{data.clients_du_jour.length>1?'s':''}</span>
          </div>
          <div className="divide-y divide-slate-50">
            {data.clients_du_jour.map(c => {
              const theorique = parseFloat(c.kg_achetes)*2500;
              const reste = theorique - parseFloat(c.montant_recu);
              return (
                <div key={c.id} className="px-5 py-3 hover:bg-slate-50 transition">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-ocean-100 text-ocean-700 text-xs font-bold whitespace-nowrap shrink-0">
                      Client {c.numero_client}
                    </span>
                    <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded shrink-0">{c.employe_nom}</span>
                    <span className="font-bold text-slate-700 text-sm">{parseFloat(c.kg_achetes).toFixed(1)} kg</span>
                    <span className="text-water-700 font-medium text-sm">{parseInt(c.montant_recu).toLocaleString('fr')} FCFA</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.reste_annule?'bg-blue-100 text-blue-700':reste>0?'bg-red-100 text-red-700':'bg-green-100 text-green-700'}`}>
                      {c.reste_annule?'✓ Reste annulé':reste>0?`Reste : ${parseInt(reste).toLocaleString('fr')} F`:'✓ Soldé'}
                    </span>
                    <span className="text-xs text-slate-400 ml-auto shrink-0">{c.heure_approx?.slice(0,5)}</span>
                  </div>
                  {c.commentaire && (
                    <div className="mt-2 flex items-start gap-1.5 ml-1">
                      <span className="text-slate-300 text-xs shrink-0 mt-0.5">💬</span>
                      <p className="text-xs text-slate-500 italic bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-lg flex-1">{c.commentaire}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center gap-4 flex-wrap">
            <span className="text-xs text-slate-500 font-semibold">Totaux :</span>
            <span className="font-bold text-slate-700 text-sm">{data.clients_du_jour.reduce((s,c)=>s+parseFloat(c.kg_achetes||0),0).toFixed(1)} kg</span>
            <span className="font-bold text-water-700 text-sm">{data.clients_du_jour.reduce((s,c)=>s+parseFloat(c.montant_recu||0),0).toLocaleString('fr')} FCFA</span>
            <span className="text-xs font-medium text-red-500">
              {data.clients_du_jour.reduce((s,c)=>{const r=parseFloat(c.kg_achetes||0)*2500-parseFloat(c.montant_recu||0);return s+(c.reste_annule?0:Math.max(0,r));},0).toLocaleString('fr')} FCFA restants
            </span>
          </div>
        </div>
      )}

      {/* Demandes en attente */}
      {data?.nb_demandes_attente > 0 && (
        <div className="card p-4 border-l-4 border-amber-400 bg-amber-50 flex items-center justify-between">
          <span className="text-sm text-amber-800 font-medium">🔔 {data.nb_demandes_attente} demande{data.nb_demandes_attente>1?'s':''} en attente</span>
          <a href="/admin/demandes" className="btn-primary text-xs py-1.5">Voir les demandes</a>
        </div>
      )}

           {/* ═══ CASSE EMPLOYÉS ═══ */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-600">💼 Caisse — Argent total détenu par employé</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {casse.map(emp => {
            let casseNette;
            if (periodeActive) {
              casseNette = parseFloat(emp.caisse_debut_periode||0)
                + parseFloat(emp.periode_encaisse||0)
                + parseFloat(emp.periode_ajouts||0)
                - parseFloat(emp.periode_retraits||0)
                - parseFloat(emp.periode_verse_patron||0);
            } else {
              const casseBrute = parseFloat(emp.total_encaisse_ventes||0)+parseFloat(emp.total_ajouts||0)-parseFloat(emp.total_retraits||0);
              casseNette = casseBrute - parseFloat(emp.total_verse_patron||0);
            }
            return (
              <div key={emp.employe_id} className="flex items-center px-5 py-3 gap-4">
                <Avatar user={{ nom:emp.employe_nom?.split(' ').slice(-1)[0]||'', prenom:emp.employe_nom?.split(' ')[0]||'' }} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700">{emp.employe_nom}</p>
                 {/*} <p className="text-xs text-slate-400">
                    {periodeActive ? `Théorique période : ${parseInt(emp.periode_theorique||0).toLocaleString('fr')} F` : `Théorique : ${parseInt(emp.total_valeur_theorique||0).toLocaleString('fr')} F`}
                    {(periodeActive ? parseFloat(emp.periode_verse_patron||0) : parseFloat(emp.total_verse_patron||0))>0 && <span className="ml-2 text-purple-500">· Versé -: {parseInt(periodeActive ? emp.periode_verse_patron : emp.total_verse_patron).toLocaleString('fr')} F</span>}
                  </p> {((periodeActive ? parseFloat(emp.periode_retraits||0) : parseFloat(emp.total_retraits||0))>0) &&
                  <p className="text-xs text-slate-400">
                    Retraits divers : -{parseInt(periodeActive ? emp.periode_retraits : emp.total_retraits).toLocaleString('fr')} F</p>}
                  */}
                    </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-water-700">{parseInt(Math.max(0,casseNette)).toLocaleString('fr')} FCFA</p>
                  <p className="text-xs text-slate-400">en caisse</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ REVENUS DES VENTES ═══ */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Revenus des ventes</h2>
          <select value={filtreStock} onChange={e => setFiltreStock(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600 focus:outline-none">
            <option value="">Tous les stocks</option>
            {stockTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="space-y-3">
          {/* Argent de la période / du mois */}
          <div className="bg-water-50 border border-water-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1 gap-2">
              <p className="text-xs font-semibold text-water-700">{periodeActive ? '📅 Argent de la période' : '📆 Argent du mois'}</p>
              {periodeActive ? (
                <select value={periodeSelectionnee?.id || ''} onChange={e => selectionnerPeriode(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600">
                  {periodes.map(p => <option key={p.id} value={p.id}>{formatSafeDate(p.date_debut, 'dd/MM/yyyy')} → {p.date_fin ? formatSafeDate(p.date_fin, 'dd/MM/yyyy') : 'en cours'}</option>)}
                </select>
              ) : <MoisSelect value={moisRevenus} onChange={setMoisRevenus} />}
            </div>
            <p className="text-2xl font-bold text-water-700">{parseInt(revenus?.mois||0).toLocaleString('fr')} F</p>
            <p className="text-xs text-slate-400 mt-1">Théorique : {parseInt(revenus?.theorique_mois||0).toLocaleString('fr')} F</p>
          </div>
          {!periodeActive && (
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-purple-700">🗓️ Argent de l'année</p>
                <AnneeSelect value={anneeRevenus} onChange={setAnneeRevenus} />
              </div>
              <p className="text-2xl font-bold text-purple-700">{parseInt(revenus?.annee||0).toLocaleString('fr')} F</p>
              <p className="text-xs text-slate-400 mt-1">Théorique : {parseInt(revenus?.theorique_annee||0).toLocaleString('fr')} F</p>
            </div>
          )}
          {/* Argent par stock sélectionné */}
          {filtreStock && (
            <div className="bg-ocean-50 border border-ocean-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-ocean-700 mb-1">📦 Argent — {filtreStock}</p>
              <p className="text-2xl font-bold text-ocean-700">{parseInt(revenus?.stock||0).toLocaleString('fr')} F</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ ARGENT RETIRÉ ═══ */}
      <div className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Argent retiré</h2>

        {/* Ce mois / cette période — sélectionnable */}
        <div className="bg-water-50 border border-water-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-water-700">{periodeActive ? '📅 Argent retiré de la période' : '📅 Argent retiré ce mois'}</p>
            {periodeActive ? <select value={periodeSelectionnee?.id || ''} onChange={e => selectionnerPeriode(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600">{periodes.map(p => <option key={p.id} value={p.id}>{formatSafeDate(p.date_debut, 'dd/MM/yyyy')} → {p.date_fin ? formatSafeDate(p.date_fin, 'dd/MM/yyyy') : 'en cours'}</option>)}</select> : <MoisSelect value={moisRetire} onChange={setMoisRetire} />}
          </div>
          <p className="text-2xl font-bold text-water-700">{argentRetireMois.toLocaleString('fr')} FCFA</p>
          <div className="text-xs text-slate-500 mt-1 space-y-0.5">
            {parseInt(mmMois.retraits||0)>0 && <p>Retraits : -{parseInt(mmMois.retraits||0).toLocaleString('fr')} F</p>}
            {parseInt(mmMois.encaissements||0)>0 && <p>Versé patron : -{parseInt(mmMois.encaissements||0).toLocaleString('fr')} F</p>}
          </div>
        </div>

        {!periodeActive && (<div>
        {/* Cette année — sélectionnable */}
        <div className="bg-ocean-50 border border-ocean-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-ocean-700">💼 Total retiré en</p>
            <AnneeSelect value={anneeRetire} onChange={setAnneeRetire} />
          </div>
          <p className="text-2xl font-bold text-ocean-700">{argentRetireAnnee.toLocaleString('fr')} FCFA</p>
          <div className="text-xs text-slate-500 mt-1 space-y-0.5">
            {parseInt(ccAnnee.retraits||0)>0 && <p>Retraits : -{parseInt(ccAnnee.retraits||0).toLocaleString('fr')} F</p>}
            {parseInt(ccAnnee.encaissements||0)>0 && <p>Versé patron : -{parseInt(ccAnnee.encaissements||0).toLocaleString('fr')} F</p>}
          </div>
        </div>
        </div>
        )}
      </div>

      {/* ═══ RESTES CUMULÉS ═══ */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4">🧾 Restes cumulés</h2>
        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1 gap-2">
              <p className="text-xs font-semibold text-amber-700">{periodeActive ? 'Reste cumulé de la période' : 'Reste cumulé du mois'}</p>
              {!periodeActive && <MoisSelect value={moisRestes} onChange={setMoisRestes} />}
              {periodeActive && <select value={periodeSelectionnee?.id || ''} onChange={e => selectionnerPeriode(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600">{periodes.map(p => <option key={p.id} value={p.id}>{formatSafeDate(p.date_debut, 'dd/MM/yyyy')} → {p.date_fin ? formatSafeDate(p.date_fin, 'dd/MM/yyyy') : 'en cours'}</option>)}</select>}
            </div>
            <p className="text-2xl font-bold text-amber-700">{parseInt(statsRestes?.mois?.reste_cumule||0).toLocaleString('fr')} F</p>
          </div>
          {!periodeActive && (
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1"><p className="text-xs font-semibold text-orange-700">Reste cumulé cette année</p><AnneeSelect value={anneeRestes} onChange={setAnneeRestes} /></div>
              <p className="text-2xl font-bold text-orange-700">{parseInt(statsRestes?.annee?.reste_cumule||0).toLocaleString('fr')} F</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ PERTES DE STOCK ═══ */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4">⚠️ Pertes de stock</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1 gap-2">
              <p className="text-xs font-semibold text-red-700">{periodeActive ? 'Kg perdus de la période' : 'Kg perdus ce mois'}</p>
              {!periodeActive && <MoisSelect value={moisPertes} onChange={setMoisPertes} />}
              {periodeActive && <select value={periodeSelectionnee?.id || ''} onChange={e => selectionnerPeriode(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600">{periodes.map(p => <option key={p.id} value={p.id}>{formatSafeDate(p.date_debut, 'dd/MM/yyyy')} → {p.date_fin ? formatSafeDate(p.date_fin, 'dd/MM/yyyy') : 'en cours'}</option>)}</select>}
            </div>
            <p className="text-2xl font-bold text-red-700">{parseFloat(statsPertes?.mois?.kg_perdus||0).toFixed(1)} kg</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-red-700 mb-1">{periodeActive ? 'Argent perdu de la période' : 'Argent perdu ce mois'}</p>
            <p className="text-2xl font-bold text-red-700">{parseInt(statsPertes?.mois?.valeur_perdue||0).toLocaleString('fr')} F</p>
          </div>
          {!periodeActive && <>
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1"><p className="text-xs font-semibold text-orange-700">Kg perdus cette année</p><AnneeSelect value={anneePertes} onChange={setAnneePertes} /></div>
              <p className="text-2xl font-bold text-orange-700">{parseFloat(statsPertes?.annee?.kg_perdus||0).toFixed(1)} kg</p>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-orange-700 mb-1">Argent perdu cette année</p>
              <p className="text-2xl font-bold text-orange-700">{parseInt(statsPertes?.annee?.valeur_perdue||0).toLocaleString('fr')} F</p>
            </div>
          </>}
        </div>
        {/* Détail par type */}
        {statsPertes?.par_type?.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
            {statsPertes.par_type.map((p,i) => (
              <div key={i} className="flex justify-between items-center text-xs text-slate-600">
                <span className="capitalize">{p.type_perte === 'mort' ? '💀 Mort' : '⚖️ Perte de poids'} — {p.type_stock}</span>
                <span className="font-bold text-red-600">{parseFloat(p.total_kg).toFixed(1)} kg</span>
              </div>
            ))}
          </div>
        )}
      </div>

 


      {/* ═══ VENTES DU MOIS — sélectionnable ═══ */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-600">{periodeActive ? "📊 Les ventes de la période" : "📊 Les ventes du mois"}</h2>
          {periodeActive ? <select value={periodeSelectionnee?.id || ''} onChange={e => selectionnerPeriode(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600">{periodes.map(p => <option key={p.id} value={p.id}>{formatSafeDate(p.date_debut, 'dd/MM/yyyy')} → {p.date_fin ? formatSafeDate(p.date_fin, 'dd/MM/yyyy') : 'en cours'}</option>)}</select> : <MoisSelect value={moisVentes} onChange={setMoisVentes} />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Date</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Clients</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Kg vendus</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Encaissé</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {ventesJour.map(v => (
                <tr key={v.date} className="hover:bg-slate-50 cursor-pointer" onClick={() => setDate(v.date)}>
                  <td className="px-4 py-3 font-medium text-slate-700">
                    {(() => { try { return formatSafeDate(v.date, 'EEE d MMM', { locale: fr }); } catch { return v.date; } })()}
                  </td>
                  <td className="px-4 py-3 text-right">{v.nb_clients}</td>
                  <td className="px-4 py-3 text-right">{parseFloat(v.kg_total||0).toFixed(1)} kg</td>
                  <td className="px-4 py-3 text-right text-water-700 font-medium">{parseInt(v.montant_encaisse||0).toLocaleString('fr')} F</td>
                </tr>
              ))}
              {ventesJour.length === 0 && (
                <tr><td colSpan={4} className="text-center py-6 text-slate-400 text-sm">Aucune vente ce mois</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      

      <Chat date={date} />
    </div>
  );
}