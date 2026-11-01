import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { useToast, ToastDisplay } from '../../components/ui/Toast';

const dateCourte = (v) => v ? new Date(`${String(v).slice(0,10)}T00:00:00`).toLocaleDateString('fr-FR') : '—';
const montant = (v) => Number(v || 0).toLocaleString('fr-FR');

export default function AdminParametres() {
  const { toast, show } = useToast();
  const [section, setSection] = useState('ventes');
  const [employes, setEmployes] = useState([]);
  const [employeId, setEmployeId] = useState('');
  const [journees, setJournees] = useState([]);
  const [journeeId, setJourneeId] = useState('');
  const [ventes, setVentes] = useState([]);
  const [demandes, setDemandes] = useState([]);
  const [demandeId, setDemandeId] = useState('');
  const [demandeForm, setDemandeForm] = useState(null);
  const [code, setCode] = useState('');
  const [autoriseHistorique, setAutoriseHistorique] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/ventes/parametres/employes').then(r => setEmployes(r.data || [])).catch(e => show(e.response?.data?.message || 'Erreur de chargement', 'error')); }, []);
  useEffect(() => {
    if (!employeId) { setJournees([]); setVentes([]); setDemandes([]); return; }
    if (section === 'ventes') api.get(`/ventes/parametres/employes/${employeId}/journees`).then(r => setJournees(r.data || [])).catch(console.error);
    else api.get(`/ventes/demandes?employe_id=${employeId}`).then(r => setDemandes(r.data || [])).catch(console.error);
    setJourneeId(''); setDemandeId(''); setVentes([]); setDemandeForm(null); setAutoriseHistorique(false);
  }, [employeId, section]);

  const journee = journees.find(j => j.id === journeeId);
  const ancien = journee && ((Date.now() - new Date(`${journee.date_vente}T00:00:00`).getTime()) / 86400000 > 45);
  const chargerVentes = async (id) => {
    setJourneeId(id); setVentes([]); setAutoriseHistorique(false);
    if (!id) return;
    const j = journees.find(x => x.id === id);
    const estAncienne = j && (Date.now() - new Date(`${j.date_vente}T00:00:00`).getTime()) / 86400000 > 45;
    if (estAncienne) {
      const saisie = window.prompt('Cette journée dépasse 45 jours. Saisissez le code développeur pour autoriser sa modification :');
      if (!saisie) return;
      try {
        await api.post(`/ventes/parametres/journees/${id}/autoriser-historique`, { code_developpeur: saisie });
        setCode(saisie); setAutoriseHistorique(true);
      } catch (e) { show(e.response?.data?.message || 'Code incorrect', 'error'); return; }
    }
    setLoading(true);
    try {
      const res = await api.get(`/ventes/journee?date=${j.date_vente}&employe_id=${employeId}`);
      setVentes(res.data.clients || []);
    } catch (e) { show(e.response?.data?.message || 'Impossible de charger les ventes', 'error'); }
    finally { setLoading(false); }
  };
  const modifierVente = async (vente, patch) => {
    try {
      await api.put(`/ventes/clients/${vente.id}`, patch, ancien ? { headers: { 'x-developer-code': code } } : {});
      show('Vente mise à jour ✓', 'success');
      const res = await api.get(`/ventes/journee?date=${journee.date_vente}&employe_id=${employeId}`);
      setVentes(res.data.clients || []);
    } catch (e) { show(e.response?.data?.message || 'Erreur de modification', 'error'); }
  };
  const choisirDemande = (id) => {
    setDemandeId(id);
    const d = demandes.find(x => x.id === id);
    if (!d) return;
    let meta = {}; try { meta = typeof d.meta === 'string' ? JSON.parse(d.meta) : (d.meta || {}); } catch {}
    setDemandeForm({ motif: d.motif || '', commentaire: d.commentaire_demande || meta.commentaire || '', montant: meta.montant ?? '', type_mouvement: meta.type_mouvement || 'retrait', date_demande: d.created_at ? new Date(d.created_at).toISOString().slice(0,16) : '', date_approbation: d.approuve_at ? new Date(d.approuve_at).toISOString().slice(0,16) : '', date_cible: d.date_cible ? String(d.date_cible).slice(0,10) : '', statut: d.statut });
  };
  const sauvegarderDemande = async () => {
    try {
      await api.patch(`/ventes/parametres/demandes/${demandeId}`, demandeForm);
      const res = await api.get(`/ventes/demandes?employe_id=${employeId}`);
      setDemandes(res.data || []);
      show('Demande modifiée ✓', 'success');
    } catch (e) { show(e.response?.data?.message || 'Erreur de modification', 'error'); }
  };
  const field = (label, key, type='text') => <label className="block text-xs font-medium text-slate-600">{label}<input type={type} value={demandeForm?.[key] ?? ''} onChange={e => setDemandeForm(f => ({ ...f, [key]: e.target.value }))} className="input mt-1" /></label>;

  return <div className="max-w-5xl space-y-5">
    <ToastDisplay toast={toast} />
    <div><h1 className="text-2xl font-bold text-slate-800">Paramètres</h1><p className="text-sm text-slate-500">Contrôle et correction des données du site.</p></div>
    <div className="flex gap-2 flex-wrap">
      <button onClick={() => { setSection('ventes'); setEmployeId(''); }} className={`px-4 py-2 rounded-lg text-sm font-semibold ${section==='ventes'?'bg-ocean-600 text-white':'bg-white border'}`}>Modifier les ventes d'une journée</button>
      <button onClick={() => { setSection('demandes'); setEmployeId(''); }} className={`px-4 py-2 rounded-lg text-sm font-semibold ${section==='demandes'?'bg-ocean-600 text-white':'bg-white border'}`}>Modifier une demande</button>
    </div>
    <div className="card p-4 space-y-3">
      <label className="block text-sm font-semibold text-slate-700">1. Choisir l'employé<select className="input mt-1" value={employeId} onChange={e => setEmployeId(e.target.value)}><option value="">Sélectionner un employé…</option>{employes.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}</select></label>
      {employeId && section==='ventes' && <>
        <label className="block text-sm font-semibold text-slate-700">2. Choisir la journée<select className="input mt-1" value={journeeId} onChange={e => chargerVentes(e.target.value)}><option value="">Sélectionner une journée…</option>{journees.map(j => <option key={j.id} value={j.id}>{dateCourte(j.date_vente)} — {j.nb_ventes} vente(s), {montant(j.total_recu)} F CFA</option>)}</select></label>
        {ancien && <p className="text-xs text-amber-700">Journée de plus de 45 jours : code développeur obligatoire {autoriseHistorique ? '— autorisation validée.' : ''}</p>}
      </>}
      {employeId && section==='demandes' && <>
        <label className="block text-sm font-semibold text-slate-700">2. Choisir la demande<select className="input mt-1" value={demandeId} onChange={e => choisirDemande(e.target.value)}><option value="">Sélectionner une demande…</option>{demandes.map(d => <option key={d.id} value={d.id}>{d.type} — {dateCourte(d.date_cible)} — {d.statut} — {(d.motif||'').slice(0,55)}</option>)}</select></label>
      </>}
    </div>
    {loading && <p className="text-sm text-slate-500">Chargement…</p>}
    {section==='ventes' && ventes.length>0 && <div className="space-y-3"><h2 className="font-bold text-slate-800">Ventes du {dateCourte(journee?.date_vente)}</h2>{ventes.map(v => <VenteEditable key={v.id} vente={v} onSave={patch => modifierVente(v, patch)} />)}</div>}
    {section==='ventes' && journeeId && !loading && ventes.length===0 && <p className="card p-5 text-sm text-slate-500">Aucune vente enregistrée pour cette journée.</p>}
    {section==='demandes' && demandeForm && <div className="card p-5 space-y-3"><h2 className="font-bold">Modifier la demande</h2>{field('Motif de la demande','motif')}{field('Commentaire','commentaire')} {['mouvement_caisse','encaissement'].includes(demandes.find(d=>d.id===demandeId)?.type) && <>{field('Montant (FCFA)','montant','number')}{demandes.find(d=>d.id===demandeId)?.type==='mouvement_caisse' && <label className="block text-xs font-medium">Type de mouvement<select className="input mt-1" value={demandeForm.type_mouvement} onChange={e=>setDemandeForm(f=>({...f,type_mouvement:e.target.value}))}><option value="retrait">Retrait</option><option value="ajout">Ajout</option></select></label>}</>}{field('Date concernée / date de mouvement','date_cible','date')}{field('Date de demande','date_demande','datetime-local')}{field("Date d'approbation",'date_approbation','datetime-local')}<label className="block text-xs font-medium">Statut<select className="input mt-1" value={demandeForm.statut} onChange={e=>setDemandeForm(f=>({...f,statut:e.target.value}))}><option value="en_attente">En attente</option><option value="approuvee">Approuvée</option><option value="refusee">Refusée</option></select></label><button onClick={sauvegarderDemande} className="btn-primary">Enregistrer les modifications</button></div>}
  </div>;
}

function VenteEditable({ vente, onSave }) {
  const [form, setForm] = useState({ client_nom: vente.client_nom || '', kg_achetes: vente.kg_achetes, montant_recu: vente.montant_recu, heure_approx: String(vente.heure_approx || '').slice(0,5), commentaire: vente.commentaire || '', type_stock: vente.type_stock || '', poids_categorie: vente.poids_categorie || '' });
  return <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div className="sm:col-span-2 font-semibold text-sm text-slate-700">Client {vente.numero_client} — {vente.client_nom || 'INCONNU'}</div>
    <label className="text-xs">Nom du client<input className="input mt-1" value={form.client_nom} onChange={e=>setForm(f=>({...f,client_nom:e.target.value}))}/></label>
    <label className="text-xs">Kg achetés<input type="number" step="0.01" className="input mt-1" value={form.kg_achetes} onChange={e=>setForm(f=>({...f,kg_achetes:e.target.value}))}/></label>
    <label className="text-xs">Montant reçu<input type="number" className="input mt-1" value={form.montant_recu} onChange={e=>setForm(f=>({...f,montant_recu:e.target.value}))}/></label>
    <label className="text-xs">Heure<input type="time" className="input mt-1" value={form.heure_approx} onChange={e=>setForm(f=>({...f,heure_approx:e.target.value}))}/></label>
    <label className="text-xs">Type de stock<input className="input mt-1" value={form.type_stock} onChange={e=>setForm(f=>({...f,type_stock:e.target.value}))}/></label>
    <label className="text-xs">Catégorie de poids<input className="input mt-1" value={form.poids_categorie} onChange={e=>setForm(f=>({...f,poids_categorie:e.target.value}))}/></label>
    <label className="text-xs sm:col-span-2">Commentaire<input className="input mt-1" value={form.commentaire} onChange={e=>setForm(f=>({...f,commentaire:e.target.value}))}/></label>
    <div className="sm:col-span-2 flex justify-end"><button onClick={()=>onSave(form)} className="btn-primary">Enregistrer cette vente</button></div>
  </div>;
}
