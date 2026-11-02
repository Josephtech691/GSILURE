import { useEffect, useMemo, useState } from 'react';
import api from '../../lib/api';
import { useToast, ToastDisplay } from '../../components/ui/Toast';

const money = (v) => `${Math.round(Number(v || 0)).toLocaleString('fr-FR')} FCFA`;
const dateLabel = (v) => v ? new Date(`${String(v).slice(0,10)}T12:00:00`).toLocaleDateString('fr-FR') : '—';

export default function AdminCaisse() {
  const { toast, show } = useToast();
  const [resume, setResume] = useState({ employes: [], totaux: {} });
  const [historique, setHistorique] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [portee, setPortee] = useState('employe');
  const [employeId, setEmployeId] = useState('');
  const [montant, setMontant] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [dateOperation, setDateOperation] = useState(new Date().toISOString().slice(0,10));
  const [filters, setFilters] = useState({ date_debut: '', date_fin: '', type: '', employe_id: '' });
  const [search, setSearch] = useState('');

  const chargerResume = async () => {
    try {
      const r = await api.get('/caisse/resume');
      setResume(r.data || { employes: [], totaux: {} });
    } catch (e) {
      show(e.response?.data?.message || 'Impossible de charger les soldes de caisse.', 'error');
    } finally { setLoading(false); }
  };

  const chargerHistorique = async () => {
    setHistoryLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([,v]) => v));
      const r = await api.get('/caisse/historique', { params });
      setHistorique(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      show(e.response?.data?.message || 'Impossible de charger l’historique.', 'error');
    } finally { setHistoryLoading(false); }
  };

  useEffect(() => { chargerResume(); }, []);
  useEffect(() => { chargerHistorique(); }, [filters.date_debut, filters.date_fin, filters.type, filters.employe_id]);

  const selectedEmployee = resume.employes.find(e => e.employe_id === employeId);
  const total = Number(montant || 0);
  const partEgale = resume.employes.length ? total / resume.employes.length : 0;
  const availableForWithdrawal = portee === 'employe' ? Number(selectedEmployee?.solde || 0) : Number(resume.totaux?.solde || 0);
  const visibleHistory = useMemo(() => historique.filter(h => {
    const q = search.trim().toLowerCase();
    return !q || `${h.employe_nom || ''} ${h.commentaire || ''} ${h.categorie || ''}`.toLowerCase().includes(q);
  }), [historique, search]);

  const effectuerRetrait = async (e) => {
    e.preventDefault();
    if (portee === 'employe' && !employeId) return show('Sélectionnez un employé.', 'error');
    if (!Number.isFinite(total) || total <= 0) return show('Saisissez un montant valide.', 'error');
    if (total > availableForWithdrawal) return show('Le montant dépasse la caisse disponible.', 'error');
    if (!commentaire.trim()) return show('Ajoutez un motif au retrait.', 'error');
    const cible = portee === 'employe' ? selectedEmployee?.employe_nom : 'tous les employés';
    if (!window.confirm(`Confirmer le retrait de ${money(total)} depuis ${cible} ? ${portee === 'globale' ? 'Le montant sera réparti également entre les employés.' : ''}`)) return;
    setSaving(true);
    try {
      const r = await api.post('/caisse/retraits', {
        portee, employe_id: portee === 'employe' ? employeId : undefined,
        montant: total, commentaire: commentaire.trim(), date_operation: dateOperation,
      });
      show(r.data?.message || 'Retrait enregistré.', 'success');
      setMontant(''); setCommentaire('');
      await Promise.all([chargerResume(), chargerHistorique()]);
    } catch (err) {
      show(err.response?.data?.message || 'Impossible d’effectuer le retrait.', 'error');
    } finally { setSaving(false); }
  };

  const t = resume.totaux || {};
  return <div className="max-w-7xl space-y-6">
    <ToastDisplay toast={toast} />
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-slate-800">Gestion de la caisse</h1><p className="text-sm text-slate-500 mt-1">Suivi des entrées, sorties, soldes des employés et retraits administrateur.</p></div>
      <button onClick={() => { setLoading(true); Promise.all([chargerResume(), chargerHistorique()]); }} className="rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">↻ Actualiser</button>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      <Stat label="Solde global disponible" value={money(t.solde)} detail="Somme des caisses individuelles" tone="green" />
      <Stat label="Entrées des ventes" value={money(t.ventes)} detail="Total des ventes encaissées" tone="blue" />
      <Stat label="Ajouts approuvés" value={money(t.ajouts)} detail="Argent ajouté aux caisses" tone="teal" />
      <Stat label="Sorties cumulées" value={money(Number(t.retraits || 0) + Number(t.versements || 0))} detail={`Retraits : ${money(t.retraits)} · Versements : ${money(t.versements)}`} tone="amber" />
    </div>

    <section className="card p-4 sm:p-5 space-y-4">
      <div><h2 className="font-bold text-slate-800 text-lg">Effectuer un retrait de caisse</h2><p className="text-xs text-slate-500 mt-1">Le retrait est enregistré immédiatement comme mouvement approuvé et déduit du solde concerné.</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button type="button" onClick={() => { setPortee('employe'); setMontant(''); }} className={`p-3 rounded-xl border text-left ${portee==='employe'?'border-ocean-600 bg-ocean-50 ring-1 ring-ocean-600':'border-slate-200'}`}>
          <span className="font-semibold text-sm">Retirer chez un employé</span><span className="block text-xs text-slate-500 mt-1">Déduit uniquement de sa caisse.</span>
        </button>
        <button type="button" onClick={() => { setPortee('globale'); setEmployeId(''); setMontant(''); }} className={`p-3 rounded-xl border text-left ${portee==='globale'?'border-ocean-600 bg-ocean-50 ring-1 ring-ocean-600':'border-slate-200'}`}>
          <span className="font-semibold text-sm">Retirer de la caisse globale</span><span className="block text-xs text-slate-500 mt-1">Répartit le même montant entre tous les employés actifs.</span>
        </button>
      </div>
      <form onSubmit={effectuerRetrait} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 items-end">
        {portee === 'employe' && <label className="text-xs font-semibold text-slate-600">Employé
          <select required value={employeId} onChange={e=>setEmployeId(e.target.value)} className="input mt-1"><option value="">Choisir un employé…</option>{resume.employes.map(emp=><option key={emp.employe_id} value={emp.employe_id}>{emp.employe_nom} — {money(emp.solde)}</option>)}</select>
        </label>}
        <label className="text-xs font-semibold text-slate-600">Montant à retirer (FCFA)
          <input required type="number" min="1" step="1" value={montant} onChange={e=>setMontant(e.target.value)} className="input mt-1" placeholder="Ex. 25000"/>
        </label>
        <label className="text-xs font-semibold text-slate-600">Date du retrait
          <input required type="date" value={dateOperation} onChange={e=>setDateOperation(e.target.value)} className="input mt-1"/>
        </label>
        <label className="text-xs font-semibold text-slate-600 sm:col-span-2 xl:col-span-1">Motif / commentaire
          <input required value={commentaire} onChange={e=>setCommentaire(e.target.value)} className="input mt-1" placeholder="Ex. Dépôt banque, dépenses…"/>
        </label>
        <div className="sm:col-span-2 xl:col-span-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3">
          <div className="text-xs text-slate-600 space-y-1">
            <p>Solde de référence : <strong>{money(availableForWithdrawal)}</strong></p>
            {portee==='globale' && <p>Part estimée par employé : <strong>{money(partEgale)}</strong> ({resume.employes.length} employés). La répartition exacte est calculée au centime côté serveur.</p>}
            {portee==='employe' && selectedEmployee && <p>Solde après retrait estimé : <strong>{money(Number(selectedEmployee.solde)-total)}</strong></p>}
          </div>
          <button disabled={saving || loading || !montant || total<=0 || total>availableForWithdrawal || (portee==='employe' && !employeId)} className="btn-primary disabled:opacity-50">{saving?'Enregistrement…':'Confirmer le retrait'}</button>
        </div>
      </form>
      <p className="text-[11px] text-slate-500">Sécurité : un retrait global est refusé si l'un des employés ne dispose pas d'une caisse suffisante pour supporter sa part égale. Aucun solde ne peut devenir négatif à la suite de cette opération.</p>
    </section>

    <section className="card p-4 sm:p-5 space-y-3">
      <div className="flex flex-wrap justify-between items-center gap-2"><div><h2 className="font-bold text-slate-800 text-lg">Soldes par employé</h2><p className="text-xs text-slate-500">Détail des calculs de chaque caisse.</p></div><span className="text-xs text-slate-500">{resume.employes.length} compte(s)</span></div>
      {loading ? <p className="py-6 text-center text-sm text-slate-500">Chargement…</p> : <div className="overflow-x-auto"><table className="w-full text-sm min-w-[680px]"><thead><tr className="text-left text-xs text-slate-500 border-b"><th className="py-2 pr-3">Employé</th><th className="py-2 pr-3 text-right">Ventes</th><th className="py-2 pr-3 text-right">Ajouts</th><th className="py-2 pr-3 text-right">Retraits</th><th className="py-2 pr-3 text-right">Versements</th><th className="py-2 text-right">Solde disponible</th></tr></thead><tbody className="divide-y">{resume.employes.map(emp=><tr key={emp.employe_id}><td className="py-3 pr-3 font-semibold text-slate-700">{emp.employe_nom}</td><td className="py-3 pr-3 text-right">{money(emp.ventes)}</td><td className="py-3 pr-3 text-right text-green-700">+{money(emp.ajouts)}</td><td className="py-3 pr-3 text-right text-red-600">−{money(emp.retraits)}</td><td className="py-3 pr-3 text-right text-purple-700">−{money(emp.versements)}</td><td className="py-3 text-right font-bold">{money(emp.solde)}</td></tr>)}</tbody></table>{resume.employes.length===0&&<p className="py-5 text-center text-sm text-slate-500">Aucun employé actif avec une caisse.</p>}</div>}
    </section>

    <section className="card p-4 sm:p-5 space-y-4">
      <div><h2 className="font-bold text-slate-800 text-lg">Historique des entrées et sorties</h2><p className="text-xs text-slate-500 mt-1">Ventes encaissées, ajouts, retraits et versements approuvés.</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        <label className="text-xs text-slate-600">Du<input type="date" value={filters.date_debut} onChange={e=>setFilters(f=>({...f,date_debut:e.target.value}))} className="input mt-1"/></label>
        <label className="text-xs text-slate-600">Au<input type="date" value={filters.date_fin} onChange={e=>setFilters(f=>({...f,date_fin:e.target.value}))} className="input mt-1"/></label>
        <label className="text-xs text-slate-600">Sens<select value={filters.type} onChange={e=>setFilters(f=>({...f,type:e.target.value}))} className="input mt-1"><option value="">Entrées et sorties</option><option value="entree">Entrées uniquement</option><option value="sortie">Sorties uniquement</option></select></label>
        <label className="text-xs text-slate-600">Employé<select value={filters.employe_id} onChange={e=>setFilters(f=>({...f,employe_id:e.target.value}))} className="input mt-1"><option value="">Tous les employés</option>{resume.employes.map(emp=><option key={emp.employe_id} value={emp.employe_id}>{emp.employe_nom}</option>)}</select></label>
        <label className="text-xs text-slate-600">Rechercher<input value={search} onChange={e=>setSearch(e.target.value)} className="input mt-1" placeholder="Nom, motif…"/></label>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-sm"><thead><tr className="border-b text-left text-xs text-slate-500"><th className="py-2 pr-2">Date</th><th className="py-2 pr-2">Employé</th><th className="py-2 pr-2">Opération</th><th className="py-2 pr-2">Commentaire</th><th className="py-2 text-right">Montant</th></tr></thead><tbody className="divide-y">
        {historyLoading ? <tr><td colSpan="5" className="py-8 text-center text-slate-500">Chargement de l’historique…</td></tr> : visibleHistory.map((h,i)=><tr key={`${h.reference}-${i}`}><td className="py-3 pr-2 whitespace-nowrap">{dateLabel(h.date_operation)}</td><td className="py-3 pr-2">{h.employe_nom || '—'}</td><td className="py-3 pr-2"><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${h.sens==='entree'?'bg-green-50 text-green-700':'bg-red-50 text-red-700'}`}>{h.categorie}</span></td><td className="py-3 pr-2 max-w-[260px] truncate">{h.commentaire || '—'}</td><td className={`py-3 text-right font-bold whitespace-nowrap ${h.sens==='entree'?'text-green-700':'text-red-600'}`}>{h.sens==='entree'?'+':'−'}{money(h.montant)}</td></tr>)}
        {!historyLoading&&visibleHistory.length===0&&<tr><td colSpan="5" className="py-8 text-center text-slate-500">Aucune opération trouvée pour ces filtres.</td></tr>}
      </tbody></table></div>
      <p className="text-[11px] text-slate-400">Les historiques affichent jusqu’à 300 opérations par défaut (maximum 1 000). Les filtres de date et d’employé permettent de retrouver les mouvements.</p>
    </section>
  </div>;
}

function Stat({ label, value, detail, tone }) {
  const tones = { green:'bg-green-50 text-green-800', blue:'bg-blue-50 text-blue-800', teal:'bg-teal-50 text-teal-800', amber:'bg-amber-50 text-amber-800' };
  return <div className={`rounded-xl p-4 ${tones[tone] || 'bg-slate-50 text-slate-800'}`}><p className="text-xs opacity-75">{label}</p><p className="text-xl sm:text-2xl font-bold mt-2 break-words">{value}</p><p className="text-[11px] opacity-70 mt-1">{detail}</p></div>;
}
