import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../../lib/api';
import Chat from '../../components/chat/Chat';
import Avatar from '../../components/ui/Avatar';

const todayStr = () => new Date().toISOString().split('T')[0];
const moisStr = () => new Date().toISOString().slice(0,7);

function StatCard({ label, value, sub, color='slate', icon }) {
  const cls = { ocean:'bg-ocean-50 text-ocean-700 border-ocean-100', water:'bg-water-50 text-water-700 border-water-100', amber:'bg-amber-50 text-amber-700 border-amber-100', red:'bg-red-50 text-red-700 border-red-100', purple:'bg-purple-50 text-purple-700 border-purple-100', slate:'bg-slate-50 text-slate-700 border-slate-100' };
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

export default function AdminDashboard() {
  const [date, setDate] = useState(todayStr());
  const [mois, setMois] = useState(moisStr());
  const [employes, setEmployes] = useState([]);
  const [filtreEmploye, setFiltreEmploye] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/employes').then(r => setEmployes(r.data)).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ date, mois });
    if (filtreEmploye) params.append('employe_id', filtreEmploye);
    api.get(`/ventes/dashboard?${params}`)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [date, mois, filtreEmploye]);

  // Options mois (12 derniers)
  const moisOptions = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const val = d.toISOString().slice(0,7);
    moisOptions.push({ val, label: format(d, 'MMMM yyyy', { locale: fr }) });
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-ocean-500 border-t-transparent rounded-full animate-spin" /></div>;

  const t = data?.totaux_jour || {};
  const stock = data?.stock || {};
  const enc = data?.encaissements || {};

  return (
    <div className="space-y-6 max-w-5xl">
      {/* En-tête + filtres */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tableau de bord</h1>
          <p className="text-sm text-slate-500">{format(new Date(date+'T12:00:00'), 'EEEE d MMMM yyyy', { locale: fr })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={filtreEmploye} onChange={e => setFiltreEmploye(e.target.value)} className="input w-auto text-sm">
            <option value="">Tous les employés</option>
            {employes.map(e => <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}
          </select>
          <input type="date" value={date} max={todayStr()} onChange={e => setDate(e.target.value)} className="input w-auto text-sm" />
        </div>
      </div>

      {/* Stats du jour */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Journée du {format(new Date(date+'T12:00:00'), 'd MMM', { locale: fr })}</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon="⚖️" label="Kg vendus" value={`${(t.kg_vendus||0).toFixed(1)} kg`} color="ocean" />
          <StatCard icon="💵" label="CA encaissé" value={`${parseInt(t.ca_total||0).toLocaleString('fr')} F`} color="water" />
          <StatCard icon="👥" label="Clients" value={t.nb_clients||0} color="slate" />
          <StatCard icon="⚠️" label="Reste à percevoir" value={`${parseInt((t.kg_vendus||0)*2500 - (t.ca_total||0)).toLocaleString('fr')} F`} color="amber" />
        </div>
      </div>

      {/* Encaissements */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex-1">Encaissements (versements au patron)</p>
          <select value={mois} onChange={e => setMois(e.target.value)} className="input w-auto text-xs py-1">
            {moisOptions.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon="📅" label={`Encaissé en ${moisOptions.find(o=>o.val===mois)?.label||mois}`} value={`${parseInt(enc.mois||0).toLocaleString('fr')} FCFA`} color="purple" />
          <StatCard icon="💰" label="Total encaissé (tous mois)" value={`${parseInt(enc.total||0).toLocaleString('fr')} FCFA`} color="purple" />
        </div>
      </div>

      {/* Stock */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-600 mb-4">📦 État du stock global</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-700">{parseFloat(stock.total_kg_achete||0).toFixed(1)}</p>
            <p className="text-xs text-slate-400 mt-0.5">kg achetés</p>
          </div>
          <div className="text-center border-x border-slate-100">
            <p className="text-2xl font-bold text-ocean-700">{parseFloat(stock.total_kg_vendu||0).toFixed(1)}</p>
            <p className="text-xs text-slate-400 mt-0.5">kg vendus</p>
          </div>
          <div className={`text-center ${parseFloat(stock.reste_kg||0) < 20 ? 'text-red-600' : 'text-water-700'}`}>
            <p className="text-2xl font-bold">{parseFloat(stock.reste_kg||0).toFixed(1)}</p>
            <p className="text-xs text-slate-400 mt-0.5">kg restants</p>
          </div>
        </div>
        {parseFloat(stock.total_kg_achete||0) > 0 && (
          <div className="mt-4">
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-water-500 rounded-full transition-all"
                style={{ width: `${Math.max(0, Math.min(100, (parseFloat(stock.reste_kg||0) / parseFloat(stock.total_kg_achete||1)) * 100))}%` }} />
            </div>
            <p className="text-xs text-slate-400 mt-1 text-right">
              {((parseFloat(stock.reste_kg||0) / parseFloat(stock.total_kg_achete||1)) * 100).toFixed(1)}% restant
            </p>
          </div>
        )}
      </div>

      {/* Stats par employé */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-600">👥 Par employé — {format(new Date(date+'T12:00:00'), 'd MMMM', { locale: fr })}</h2>
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
                  <td className={`px-4 py-3 text-right font-medium ${parseInt(emp.kg_vendus_jour||0)*2500 - parseInt(emp.ca_jour||0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {(parseInt(emp.kg_vendus_jour||0)*2500 - parseInt(emp.ca_jour||0)).toLocaleString('fr')} F
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Casse par employé */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-600">💼 Casse — Argent total détenu par employé</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {(data?.casse_employes||[]).map(emp => {
            const casseBrute = parseFloat(emp.total_encaisse_ventes||0) + parseFloat(emp.total_ajouts||0) - parseFloat(emp.total_retraits||0);
            const casseNette = casseBrute - parseFloat(emp.total_verse_patron||0);
            return (
              <div key={emp.employe_id} className="flex items-center px-5 py-3 gap-4">
                <Avatar user={{ nom: emp.employe_nom?.split(' ').slice(-1)[0]||'', prenom: emp.employe_nom?.split(' ')[0]||'' }} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700">{emp.employe_nom}</p>
                  <p className="text-xs text-slate-400">
                    Théorique : {parseInt(emp.total_valeur_theorique||0).toLocaleString('fr')} F
                    {parseFloat(emp.total_verse_patron||0) > 0 && <span className="ml-2 text-purple-500">· Versé patron : {parseInt(emp.total_verse_patron).toLocaleString('fr')} F</span>}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-water-700">{parseInt(Math.max(0, casseNette)).toLocaleString('fr')} FCFA</p>
                  <p className="text-xs text-slate-400">en caisse</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      
           {/* ═══ CLIENTS DU JOUR — "Client N" + commentaires ═══ */}
{(data?.clients_du_jour||[]).length > 0 && (
  <div className="card overflow-hidden">
    <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
      <h2 className="text-sm font-semibold text-slate-600">
        🛒 Clients du {format(new Date(date+'T12:00:00'), 'd MMMM', { locale: fr })}
      </h2>
      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
        {data.clients_du_jour.length} client{data.clients_du_jour.length>1?'s':''}
      </span>
    </div>

    <div className="divide-y divide-slate-50">
      {data.clients_du_jour.map(c => {
        const theorique = parseFloat(c.kg_achetes)*2500;
        const reste = theorique - parseFloat(c.montant_recu);
        return (
          <div key={c.id} className="px-5 py-3 hover:bg-slate-50 transition">
            {/* Ligne principale */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* "Client N" en badge — plus "C" */}
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-ocean-100 text-ocean-700 text-xs font-bold whitespace-nowrap shrink-0">
                Client {c.numero_client}
              </span>
              <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                {c.employe_nom}
              </span>
              <span className="font-bold text-slate-700 text-sm">{parseFloat(c.kg_achetes).toFixed(1)} kg</span>
              <span className="text-water-700 font-medium text-sm">{parseInt(c.montant_recu).toLocaleString('fr')} FCFA</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                c.reste_annule ? 'bg-blue-100 text-blue-700'
                : reste > 0 ? 'bg-red-100 text-red-700'
                : 'bg-green-100 text-green-700'
              }`}>
                {c.reste_annule ? '✓ Reste annulé'
                  : reste > 0 ? `Reste : ${parseInt(reste).toLocaleString('fr')} F`
                  : '✓ Soldé'}
              </span>
              <span className="text-xs text-slate-400 ml-auto shrink-0">{c.heure_approx?.slice(0,5)}</span>
            </div>

            {/* Commentaire employé — affiché seulement si présent */}
            {c.commentaire && (
              <div className="mt-2 flex items-start gap-1.5 ml-1">
                <span className="text-slate-300 text-xs shrink-0 mt-0.5">💬</span>
                <p className="text-xs text-slate-500 italic bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-lg leading-relaxed flex-1">
                  {c.commentaire}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>

    {/* Totaux bas */}
    <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center gap-4 flex-wrap">
      <span className="text-xs text-slate-500 font-semibold">Totaux :</span>
      <span className="font-bold text-slate-700 text-sm">
        {data.clients_du_jour.reduce((s,c)=>s+parseFloat(c.kg_achetes||0),0).toFixed(1)} kg
      </span>
      <span className="font-bold text-water-700 text-sm">
        {data.clients_du_jour.reduce((s,c)=>s+parseFloat(c.montant_recu||0),0).toLocaleString('fr')} FCFA encaissés
      </span>
      <span className="text-xs font-medium text-red-500">
        {data.clients_du_jour.reduce((s,c)=>{
          const r=parseFloat(c.kg_achetes||0)*2500-parseFloat(c.montant_recu||0);
          return s+(c.reste_annule?0:Math.max(0,r));
        },0).toLocaleString('fr')} FCFA restants
      </span>
    </div>
  </div>
)}
      {/* Demandes en attente — badge */}
      {data?.nb_demandes_attente > 0 && (
        <div className="card p-4 border-l-4 border-amber-400 bg-amber-50 flex items-center justify-between">
          <span className="text-sm text-amber-800 font-medium">🔔 {data.nb_demandes_attente} demande{data.nb_demandes_attente > 1 ? 's' : ''} en attente</span>
          <a href="/admin/demandes" className="btn-primary text-xs py-1.5">Voir les demandes</a>
        </div>
      )}

      <Chat date={date} />
    </div>
  );
}
