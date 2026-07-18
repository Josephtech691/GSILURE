import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../../lib/api';
import Avatar from '../../components/ui/Avatar';
import { useToast, ToastDisplay } from '../../components/ui/Toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function ModalEmploye({ employe, stats, graphique, onClose, onSauvegarder }) {
  const [editForm, setEditForm] = useState({ nom: employe.nom, prenom: employe.prenom, telephone: employe.telephone || '', nouveau_mdp: '' });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('infos');

  const sauvegarder = async () => {
    setLoading(true);
    try {
      await onSauvegarder(employe.id, editForm);
      onClose();
    } finally { setLoading(false); }
  };

  const donnees = (graphique || []).map(d => ({
    jour: format(new Date(d.date+'T12:00:00'), 'd MMM', { locale: fr }),
    kg: parseFloat(d.kg_vendus),
    montant: parseFloat(d.montant_encaisse),
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 p-5 border-b border-slate-100">
          <Avatar user={employe} size="lg" />
          <div className="flex-1">
            <h2 className="font-bold text-slate-800">{employe.prenom} {employe.nom}</h2>
            <p className="text-sm text-slate-500">{employe.email}</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${employe.actif ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
              {employe.actif ? 'Actif' : 'Inactif'}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          {[{ id:'infos', label:'Informations'}, { id:'stats', label:'Statistiques'}, { id:'graphique', label:'Graphique'}].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-sm font-medium transition ${activeTab === tab.id ? 'text-ocean-600 border-b-2 border-ocean-600' : 'text-slate-500 hover:text-slate-700'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {/* Tab Infos */}
          {activeTab === 'infos' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Prénom</label>
                  <input type="text" value={editForm.prenom} onChange={e => setEditForm({...editForm, prenom: e.target.value})} className="input" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Nom</label>
                  <input type="text" value={editForm.nom} onChange={e => setEditForm({...editForm, nom: e.target.value})} className="input" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                <input value={employe.email} disabled className="input bg-slate-50 text-slate-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Téléphone</label>
                <input type="tel" value={editForm.telephone} onChange={e => setEditForm({...editForm, telephone: e.target.value})} className="input" placeholder="+225 00 00 00 00" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nouveau mot de passe (laisser vide pour ne pas changer)</label>
                <input type="password" value={editForm.nouveau_mdp} onChange={e => setEditForm({...editForm, nouveau_mdp: e.target.value})} className="input" placeholder="6 caractères minimum" />
              </div>
              <div className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
                Membre depuis le {format(new Date(employe.created_at), 'd MMMM yyyy', { locale: fr })}
              </div>
              <button onClick={sauvegarder} disabled={loading} className="btn-primary w-full justify-center">
                {loading ? 'Sauvegarde…' : 'Sauvegarder les modifications'}
              </button>
            </div>
          )}

          {/* Tab Stats */}
          {activeTab === 'stats' && stats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Kg vendus (total)', value: `${parseFloat(stats.total_kg).toFixed(1)} kg`, color: 'text-ocean-700' },
                  { label: 'Montant encaissé', value: `${parseInt(stats.total_encaisse).toLocaleString('fr')} FCFA`, color: 'text-water-700' },
                  { label: 'Jours travaillés', value: stats.nb_jours_travailles, color: 'text-slate-700' },
                  { label: 'Clients servis', value: stats.nb_clients, color: 'text-purple-700' },
                ].map(s => (
                  <div key={s.label} className="bg-slate-50 rounded-xl p-4 text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-slate-400 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">Valeur théorique totale</p>
                <p className="text-xl font-bold text-slate-700">{(parseFloat(stats.total_kg) * 2500).toLocaleString('fr')} FCFA</p>
                <p className="text-xs text-red-500 mt-1">
                  Reste à percevoir : {Math.max(0, parseFloat(stats.total_kg) * 2500 - parseFloat(stats.total_encaisse)).toLocaleString('fr')} FCFA
                </p>
              </div>
            </div>
          )}

          {/* Tab Graphique */}
          {activeTab === 'graphique' && (
            <div>
              <p className="text-xs text-slate-500 mb-3">Ventes du mois en cours</p>
              {donnees.length === 0
                ? <p className="text-center text-slate-400 text-sm py-8">Aucune vente ce mois-ci</p>
                : (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={donnees}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="jour" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 9 }} unit=" kg" />
                        <Tooltip formatter={v => [`${parseFloat(v).toFixed(1)} kg`, 'Kg']} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                        <Bar dataKey="kg" fill="#1a78ed" radius={[3,3,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <ResponsiveContainer width="100%" height={160} className="mt-4">
                      <BarChart data={donnees}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="jour" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 9 }} />
                        <Tooltip formatter={v => [`${parseInt(v).toLocaleString('fr')} F`, 'Encaissé']} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                        <Bar dataKey="montant" fill="#0d937c" radius={[3,3,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminEmployes() {
  const { toast, show } = useToast();
  const [employes, setEmployes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [selectedStats, setSelectedStats] = useState(null);
  const [selectedGraph, setSelectedGraph] = useState(null);
  const [form, setForm] = useState({ nom:'', prenom:'', email:'', password:'', telephone:'' });
  const [creerLoading, setCreerLoading] = useState(false);

  const charger = () => api.get('/auth/employes').then(r => { setEmployes(r.data); setLoading(false); }).catch(console.error);
  useEffect(() => { charger(); }, []);

  const ouvrirEmploye = async (emp) => {
    setSelected(emp);
    try {
      const [detailRes, graphRes] = await Promise.all([
        api.get(`/auth/employes/${emp.id}`),
        api.get(`/ventes/graphique?employe_id=${emp.id}&mois=${new Date().toISOString().slice(0,7)}`),
      ]);
      setSelectedStats(detailRes.data.stats);
      setSelectedGraph(graphRes.data.donnees);
    } catch {}
  };

  const creer = async (e) => {
    e.preventDefault();
    setCreerLoading(true);
    try {
      await api.post('/auth/creer-employe', form);
      setForm({ nom:'', prenom:'', email:'', password:'', telephone:'' });
      setShowForm(false);
      charger();
      show('Compte créé ✓', 'success');
    } catch (err) { show(err.response?.data?.message || 'Erreur', 'error'); }
    finally { setCreerLoading(false); }
  };

  const modifier = async (id, editForm) => {
    try {
      await api.patch(`/auth/employes/${id}`, editForm);
      charger();
      show('Employé modifié ✓', 'success');
    } catch (err) { show(err.response?.data?.message || 'Erreur', 'error'); throw err; }
  };

  const toggleActif = async (id, actif) => {
    try {
      await api.patch(`/auth/employes/${id}/actif`, { actif: !actif });
      charger();
      show(`Compte ${!actif ? 'activé' : 'désactivé'}`, 'success');
    } catch { show('Erreur', 'error'); }
  };

  return (
    <div className="max-w-3xl space-y-5">
      <ToastDisplay toast={toast} />

      {selected && (
        <ModalEmploye
          employe={selected} stats={selectedStats} graphique={selectedGraph}
          onClose={() => { setSelected(null); setSelectedStats(null); setSelectedGraph(null); }}
          onSauvegarder={modifier}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Employés</h1>
          <p className="text-sm text-slate-500">{employes.length} compte{employes.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? '✕ Fermer' : '+ Nouvel employé'}
        </button>
      </div>

      {showForm && (
        <div className="card p-5 border-l-4 border-ocean-500">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Créer un compte employé</h2>
          <form onSubmit={creer} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Prénom *</label>
                <input type="text" required value={form.prenom} onChange={e => setForm({...form, prenom: e.target.value})} className="input" /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Nom *</label>
                <input type="text" required value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} className="input" /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Email *</label>
                <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input" /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Téléphone</label>
                <input type="tel" value={form.telephone} onChange={e => setForm({...form, telephone: e.target.value})} className="input" /></div>
              <div className="col-span-2"><label className="block text-xs font-medium text-slate-500 mb-1">Mot de passe *</label>
                <input type="password" required minLength={6} value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="input" placeholder="6 caractères min." /></div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={creerLoading} className="btn-primary">{creerLoading ? 'Création…' : 'Créer le compte'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
            </div>
          </form>
        </div>
      )}

      {/* Liste */}
      <div className="card overflow-hidden">
        {loading
          ? <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-ocean-500 border-t-transparent rounded-full animate-spin" /></div>
          : employes.length === 0
            ? <div className="py-12 text-center text-slate-400 text-sm"><p className="text-2xl mb-2">👥</p>Aucun employé enregistré.</div>
            : <div className="divide-y divide-slate-50">
                {employes.map(emp => (
                  <div key={emp.id} className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 cursor-pointer transition" onClick={() => ouvrirEmploye(emp)}>
                    <Avatar user={emp} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${emp.actif ? 'text-slate-700' : 'text-slate-400'}`}>{emp.prenom} {emp.nom}</p>
                      <p className="text-xs text-slate-400 truncate">{emp.email}</p>
                      {emp.telephone && <p className="text-xs text-slate-300">{emp.telephone}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${emp.actif ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {emp.actif ? 'Actif' : 'Inactif'}
                      </span>
                      <button onClick={() => toggleActif(emp.id, emp.actif)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition ${emp.actif ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                        {emp.actif ? 'Désactiver' : 'Activer'}
                      </button>
                    </div>
                    <span className="text-slate-300 text-sm">›</span>
                  </div>
                ))}
              </div>
        }
      </div>
    </div>
  );
}
