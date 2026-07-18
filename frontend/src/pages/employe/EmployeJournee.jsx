import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { getSocket } from '../../lib/socket';
import Chat from '../../components/chat/Chat';
import { useToast, ToastDisplay } from '../../components/ui/Toast';

const PRIX_KG = 2500;
const todayStr = () => new Date().toISOString().split('T')[0];

function CarteClient({ client, readOnly, onModifier, onSupprimer, onDemanderAnnulation }) {
  const [edition, setEdition] = useState(false);
  const [form, setForm] = useState({
    kg_achetes: client.kg_achetes,
    montant_recu: client.montant_recu,
    heure_approx: client.heure_approx?.slice(0,5) || '',
    commentaire: client.commentaire || '',
  });
  const [showAnnulation, setShowAnnulation] = useState(false);
  const [motifAnnulation, setMotifAnnulation] = useState('');
  const [loading, setLoading] = useState(false);

  const kg = parseFloat(client.kg_achetes || 0);
  const recu = parseFloat(client.montant_recu || 0);
  const theorique = kg * PRIX_KG;
  const reste = theorique - recu;
  const resteAnnule = client.reste_annule || client.reste_annule_statut === 'approuvee';
  const resteEnAttente = client.reste_annule_statut === 'en_attente';

  const sauvegarder = async () => {
    setLoading(true);
    try { await onModifier(client.id, form); setEdition(false); }
    finally { setLoading(false); }
  };

  const soumettrAnnulation = async (e) => {
    e.preventDefault();
    if (!motifAnnulation.trim()) return;
    setLoading(true);
    try {
      await onDemanderAnnulation(client.id, motifAnnulation);
      setShowAnnulation(false);
      setMotifAnnulation('');
    } finally { setLoading(false); }
  };

  if (edition) return (
    <div className="card p-4 border-l-4 border-ocean-500">
      <div className="flex justify-between items-center mb-3">
        <span className="font-semibold text-sm text-slate-700">Client {client.numero_client} — Édition</span>
        <button onClick={() => setEdition(false)} className="text-xs text-slate-400 hover:text-slate-600">Annuler</button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-xs font-medium text-slate-500 mb-1">Kg</label>
          <input type="number" step="0.1" min="0.1" value={form.kg_achetes} onChange={e => setForm({...form, kg_achetes: e.target.value})} className="input" /></div>
        <div><label className="block text-xs font-medium text-slate-500 mb-1">Montant reçu (FCFA)</label>
          <input type="number" min="0" value={form.montant_recu} onChange={e => setForm({...form, montant_recu: e.target.value})} className="input" /></div>
        <div><label className="block text-xs font-medium text-slate-500 mb-1">Heure</label>
          <input type="time" value={form.heure_approx} onChange={e => setForm({...form, heure_approx: e.target.value})} className="input" /></div>
        <div><label className="block text-xs font-medium text-slate-500 mb-1">Commentaire</label>
          <input type="text" value={form.commentaire} onChange={e => setForm({...form, commentaire: e.target.value})} className="input" placeholder="Optionnel" /></div>
      </div>
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-slate-500">Valeur : <strong>{(parseFloat(form.kg_achetes||0)*PRIX_KG).toLocaleString('fr')} FCFA</strong></span>
        <button onClick={sauvegarder} disabled={loading} className="btn-primary py-1.5 text-xs">{loading ? '…' : 'Sauvegarder'}</button>
      </div>
    </div>
  );

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-ocean-100 text-ocean-700 text-xs font-bold flex items-center justify-center shrink-0">{client.numero_client}</span>
          <div>
            <p className="font-semibold text-slate-700 text-sm">Client {client.numero_client}</p>
            <p className="text-xs text-slate-400">{client.heure_approx?.slice(0,5)}</p>
            {client.commentaire && <p className="text-xs text-slate-500 italic mt-0.5">{client.commentaire}</p>}
          </div>
        </div>
        {!readOnly && (
          <div className="flex gap-1">
            <button onClick={() => setEdition(true)} className="p-1.5 text-slate-400 hover:text-ocean-600 hover:bg-ocean-50 rounded" title="Modifier">✏️</button>
            <button onClick={() => onSupprimer(client.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Supprimer">🗑️</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="text-center p-2 bg-slate-50 rounded-lg">
          <p className="text-lg font-bold text-slate-700">{kg.toFixed(1)}</p>
          <p className="text-xs text-slate-400">kg</p>
        </div>
        <div className="text-center p-2 bg-water-50 rounded-lg">
          <p className="text-sm font-bold text-water-700">{recu.toLocaleString('fr')}</p>
          <p className="text-xs text-water-500">FCFA reçus</p>
        </div>
        <div className={`text-center p-2 rounded-lg ${resteAnnule ? 'bg-green-50' : resteEnAttente ? 'bg-amber-50' : reste > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
          {resteAnnule ? (
            <><p className="text-sm font-bold text-green-600">✓</p><p className="text-xs text-green-500">Annulé</p></>
          ) : resteEnAttente ? (
            <><p className="text-sm font-bold text-amber-600">⏳</p><p className="text-xs text-amber-500">En attente</p></>
          ) : reste > 0 ? (
            <><p className="text-sm font-bold text-red-600">{reste.toLocaleString('fr')}</p><p className="text-xs text-red-400">reste</p></>
          ) : (
            <><p className="text-sm font-bold text-green-600">✓</p><p className="text-xs text-green-500">soldé</p></>
          )}
        </div>
      </div>

      {/* Bouton annuler le reste */}
      {reste > 0 && !resteAnnule && !resteEnAttente && !readOnly && (
        <button onClick={() => setShowAnnulation(!showAnnulation)}
          className="mt-2 w-full text-xs py-1.5 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition">
          🤝 Annuler ce reste ({reste.toLocaleString('fr')} FCFA) — marché conclu / retrait ultérieur
        </button>
      )}

      {showAnnulation && (
        <form onSubmit={soumettrAnnulation} className="mt-2 p-3 bg-amber-50 rounded-lg space-y-2">
          <p className="text-xs font-medium text-amber-700">Motif de l'annulation (requis pour approbation patron) :</p>
          <textarea value={motifAnnulation} onChange={e => setMotifAnnulation(e.target.value)}
            placeholder="Ex: Marché approuvé par le patron le 12/07 — remise accordée…"
            rows={2} className="input resize-none text-xs" required />
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="btn-primary text-xs py-1">{loading ? '…' : 'Soumettre'}</button>
            <button type="button" onClick={() => setShowAnnulation(false)} className="btn-secondary text-xs py-1">Annuler</button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function EmployeJournee() {
  const { user } = useAuth();
  const { toast, show } = useToast();
  const [date, setDate] = useState(todayStr());
  const [journee, setJournee] = useState(null);
  const [clients, setClients] = useState([]);
  const [totaux, setTotaux] = useState({ total_kg: 0, total_recu: 0, valeur_theorique: 0 });
  const [loading, setLoading] = useState(true);
  const [ajoutLoading, setAjoutLoading] = useState(false);
  const [nouveauClient, setNouveauClient] = useState(null);
  const [showDemandeForm, setShowDemandeForm] = useState(false);
  const [demandeMotif, setDemandeMotif] = useState('');

  const isToday = date === todayStr();

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/ventes/journee?date=${date}`);
      setJournee(res.data.journee);
      setClients(res.data.clients);
      setTotaux(res.data.totaux);
    } catch (err) {
      if (err.response?.status === 404) { setJournee(null); setClients([]); }
    } finally { setLoading(false); }
  }, [date]);

  useEffect(() => { charger(); }, [charger]);

  const recalc = (liste) => {
    setTotaux(liste.reduce((acc, c) => ({
      total_kg: acc.total_kg + parseFloat(c.kg_achetes||0),
      total_recu: acc.total_recu + parseFloat(c.montant_recu||0),
      valeur_theorique: acc.valeur_theorique + parseFloat(c.kg_achetes||0)*PRIX_KG,
    }), { total_kg:0, total_recu:0, valeur_theorique:0 }));
  };

  const ajouterClient = async (e) => {
    e.preventDefault();
    if (!journee) return;
    setAjoutLoading(true);
    try {
      const res = await api.post(`/ventes/journee/${journee.id}/clients`, nouveauClient);
      const newList = [...clients, res.data.client];
      setClients(newList); recalc(newList); setNouveauClient(null);
      show('Client ajouté ✓', 'success');
    } catch (err) {
      if (err.queued) show('📶 Hors ligne — sauvegardé localement', 'info');
      else show(err.response?.data?.message || 'Erreur', 'error');
    } finally { setAjoutLoading(false); }
  };

  const modifierClient = async (id, form) => {
    try {
      const res = await api.put(`/ventes/clients/${id}`, form);
      const newList = clients.map(c => c.id === id ? res.data.client : c);
      setClients(newList); recalc(newList);
      show('Modifié ✓', 'success');
    } catch (err) { show(err.response?.data?.message || 'Erreur', 'error'); }
  };

  const supprimerClient = async (id) => {
    if (!confirm('Supprimer ce client ?')) return;
    try {
      await api.delete(`/ventes/clients/${id}`);
      const newList = clients.filter(c => c.id !== id);
      setClients(newList); recalc(newList);
      show('Client supprimé', 'success');
    } catch (err) { show(err.response?.data?.message || 'Erreur', 'error'); }
  };

  const demanderAnnulation = async (clientId, motif) => {
    try {
      await api.post(`/ventes/clients/${clientId}/annuler-reste`, { motif });
      const socket = getSocket();
      socket?.connected && socket.emit('demande-soumise', { type: 'annulation_reste', date, message: `Demande d'annulation de reste (${date})` });
      await charger();
      show('Demande d\'annulation envoyée ✓', 'success');
    } catch (err) { show(err.response?.data?.message || 'Erreur', 'error'); }
  };

  const demanderModification = async (e) => {
    e.preventDefault();
    if (!journee || !demandeMotif.trim()) return;
    try {
      await api.post('/ventes/demandes-modification', { journee_id: journee.id, motif: demandeMotif });
      const socket = getSocket();
      socket?.connected && socket.emit('demande-soumise', { type: 'modification_journee', date, motif: demandeMotif, journee_id: journee.id, message: `${user.prenom} demande une modification pour le ${date}` });
      setShowDemandeForm(false); setDemandeMotif('');
      show('Demande envoyée au patron ✓', 'success');
    } catch (err) { show(err.response?.data?.message || 'Erreur', 'error'); }
  };

  const canEdit = isToday || journee?.modification_autorisee;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <ToastDisplay toast={toast} />

      {/* En-tête */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Ventes du jour</h1>
          <p className="text-sm text-slate-500">{format(new Date(date+'T12:00:00'), 'EEEE d MMMM yyyy', { locale: fr })}</p>
        </div>
        <input type="date" value={date} max={todayStr()} onChange={e => setDate(e.target.value)} className="input w-auto text-sm" />
      </div>

      {/* Bannière jour passé */}
      {!isToday && (
        <div className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm ${canEdit ? 'bg-water-50 border border-water-200 text-water-800' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
          <span>{canEdit ? '✅ Modification autorisée (24h)' : '🔒 Lecture seule — journée passée'}</span>
          {!canEdit && journee && (
            <button onClick={() => setShowDemandeForm(true)} className="text-xs font-semibold underline">Demander une modif</button>
          )}
        </div>
      )}

      {/* Formulaire demande modification */}
      {showDemandeForm && (
        <div className="card p-4 border-l-4 border-amber-400">
          <h3 className="font-semibold text-sm text-slate-700 mb-3">Demande de modification</h3>
          <form onSubmit={demanderModification} className="space-y-3">
            <textarea value={demandeMotif} onChange={e => setDemandeMotif(e.target.value)} rows={3}
              placeholder="Pourquoi souhaitez-vous modifier cette journée ?" className="input resize-none" required />
            <div className="flex gap-2">
              <button type="submit" className="btn-primary text-xs">Envoyer</button>
              <button type="button" onClick={() => setShowDemandeForm(false)} className="btn-secondary text-xs">Annuler</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-ocean-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* Totaux */}
          {(clients.length > 0 || journee) && (
            <div className="grid grid-cols-3 gap-3">
              <div className="stat-card text-center"><p className="text-2xl font-bold text-slate-700">{totaux.total_kg.toFixed(1)}</p><p className="text-xs text-slate-400 mt-0.5">kg vendus</p></div>
              <div className="stat-card text-center"><p className="text-lg font-bold text-water-700">{totaux.total_recu.toLocaleString('fr')}</p><p className="text-xs text-slate-400 mt-0.5">FCFA encaissés</p></div>
              <div className={`stat-card text-center ${totaux.valeur_theorique - totaux.total_recu > 0 ? 'border-red-200' : 'border-green-200'}`}>
                <p className={`text-lg font-bold ${totaux.valeur_theorique - totaux.total_recu > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {(totaux.valeur_theorique - totaux.total_recu).toLocaleString('fr')}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">FCFA restants</p>
              </div>
            </div>
          )}

          {/* Liste clients */}
          <div className="space-y-3">
            {clients.map(c => (
              <CarteClient key={c.id} client={c} readOnly={!canEdit}
                onModifier={modifierClient} onSupprimer={supprimerClient} onDemanderAnnulation={demanderAnnulation} />
            ))}
            {clients.length === 0 && !nouveauClient && (
              <div className="card p-8 text-center text-slate-400">
                <p className="text-3xl mb-2">🐟</p>
                <p className="text-sm">Aucun client pour cette journée.</p>
              </div>
            )}
          </div>

          {/* Formulaire nouveau client */}
          {nouveauClient && (
            <div className="card p-4 border-l-4 border-water-500">
              <div className="flex justify-between items-center mb-3">
                <span className="font-semibold text-sm text-slate-700">Client {clients.length + 1} — Nouveau</span>
                <button onClick={() => setNouveauClient(null)} className="text-xs text-slate-400">Annuler</button>
              </div>
              <form onSubmit={ajouterClient} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-slate-500 mb-1">Kg achetés *</label>
                    <input type="number" step="0.1" min="0.1" required autoFocus value={nouveauClient.kg_achetes}
                      onChange={e => setNouveauClient({...nouveauClient, kg_achetes: e.target.value})} className="input" /></div>
                  <div><label className="block text-xs font-medium text-slate-500 mb-1">Montant reçu (FCFA) *</label>
                    <input type="number" min="0" required value={nouveauClient.montant_recu}
                      onChange={e => setNouveauClient({...nouveauClient, montant_recu: e.target.value})} className="input" /></div>
                  <div><label className="block text-xs font-medium text-slate-500 mb-1">Heure</label>
                    <input type="time" value={nouveauClient.heure_approx}
                      onChange={e => setNouveauClient({...nouveauClient, heure_approx: e.target.value})} className="input" /></div>
                  <div><label className="block text-xs font-medium text-slate-500 mb-1">Commentaire</label>
                    <input type="text" value={nouveauClient.commentaire} placeholder="Optionnel"
                      onChange={e => setNouveauClient({...nouveauClient, commentaire: e.target.value})} className="input" /></div>
                </div>
                {nouveauClient.kg_achetes && (
                  <div className="text-xs text-slate-500 px-1">
                    Valeur : <strong>{(parseFloat(nouveauClient.kg_achetes)*PRIX_KG).toLocaleString('fr')} FCFA</strong>
                    {nouveauClient.montant_recu && (
                      <span className={parseFloat(nouveauClient.montant_recu) < parseFloat(nouveauClient.kg_achetes)*PRIX_KG ? 'text-red-500 ml-2' : 'text-green-500 ml-2'}>
                        Reste : {(parseFloat(nouveauClient.kg_achetes)*PRIX_KG - parseFloat(nouveauClient.montant_recu)).toLocaleString('fr')} FCFA
                      </span>
                    )}
                  </div>
                )}
                <button type="submit" disabled={ajoutLoading} className="btn-success w-full py-2.5 justify-center">
                  {ajoutLoading ? 'Enregistrement…' : '✓ Enregistrer ce client'}
                </button>
              </form>
            </div>
          )}

          {canEdit && !nouveauClient && (
            <button onClick={() => setNouveauClient({ kg_achetes:'', montant_recu:'', heure_approx: new Date().toTimeString().slice(0,5), commentaire:'' })}
              className="btn-primary w-full py-3 justify-center text-base">
              + Nouveau Client
            </button>
          )}

          {journee && <Chat date={date} />}
        </>
      )}
    </div>
  );
}
