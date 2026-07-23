import { useState, useEffect } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../../lib/api';
import { getSocket } from '../../lib/socket';
import Avatar from '../../components/ui/Avatar';
import { useToast, ToastDisplay } from '../../components/ui/Toast';

const TYPE_META = {
  modification_journee: { icon: '📅', label: 'Modification journée', color: 'border-amber-400 bg-amber-50' },
  annulation_reste:     { icon: '🤝', label: 'Annulation de reste',  color: 'border-blue-400 bg-blue-50' },
  mouvement_caisse:     { icon: '💼', label: 'Mouvement de caisse',  color: 'border-green-400 bg-green-50' },
  encaissement:         { icon: '💰', label: 'Versement au patron',  color: 'border-purple-400 bg-purple-50' },
};

const STATUT_CLS = {
  en_attente: 'bg-amber-100 text-amber-700',
  approuvee:  'bg-green-100 text-green-700',
  refusee:    'bg-red-100 text-red-700',
};

export default function AdminDemandes() {
  const { toast, show } = useToast();
  const [demandes, setDemandes] = useState([]);
  const [statut, setStatut] = useState('en_attente');
  const [typeFiltre, setTypeFiltre] = useState('');
  const [loading, setLoading] = useState(true);

  const charger = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statut) params.append('statut', statut);
      if (typeFiltre) params.append('type', typeFiltre);
      const res = await api.get(`/ventes/demandes?${params}`);
      setDemandes(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { charger(); }, [statut, typeFiltre]);

  const traiter = async (id, nouveauStatut, demande) => {
    const verb = nouveauStatut === 'approuvee' ? 'approuver' : 'refuser';
    if (!confirm(`Voulez-vous ${verb} cette demande ?`)) return;
    try {
      await api.patch(`/ventes/demandes/${id}`, { statut: nouveauStatut });
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit('demande-traitee', {
          employe_id: demande.employe_id,
          statut: nouveauStatut,
          type: demande.type,
          date: demande.date_cible,
          message: `Demande "${TYPE_META[demande.type]?.label}" : ${nouveauStatut === 'approuvee' ? 'approuvée ✅' : 'refusée ❌'}`,
        });
      }
      charger();
      show(`Demande ${nouveauStatut === 'approuvee' ? 'approuvée' : 'refusée'} ✓`, nouveauStatut === 'approuvee' ? 'success' : 'error');
    } catch (err) { show(err.response?.data?.message || 'Erreur', 'error'); }
  };

  const nbAttente = demandes.length;

  return (
    <div className="max-w-3xl space-y-5">
      <ToastDisplay toast={toast} />

      <div>
        <h1 className="text-2xl font-bold text-slate-800">Demandes</h1>
        <p className="text-sm text-slate-500">
          {statut === 'en_attente' && nbAttente > 0
            ? `${nbAttente} demande${nbAttente > 1 ? 's' : ''} en attente`
            : 'Toutes les demandes des employés'}
        </p>
      </div>

      {/* Filtres statut */}
      <div className="flex gap-2 flex-wrap">
        {[
          { val:'en_attente', label:'⏳ En attente' },
          { val:'approuvee',  label:'✅ Approuvées' },
          { val:'refusee',    label:'❌ Refusées' },
          { val:'',           label:'Toutes' },
        ].map(f => (
          <button key={f.val} onClick={() => setStatut(f.val)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${statut === f.val ? 'bg-ocean-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Filtres type */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setTypeFiltre('')} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${typeFiltre === '' ? 'bg-slate-700 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>Tous types</button>
        {Object.entries(TYPE_META).map(([key, meta]) => (
          <button key={key} onClick={() => setTypeFiltre(key)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${typeFiltre === key ? 'bg-slate-700 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
            {meta.icon} {meta.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-ocean-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : demandes.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <p className="text-3xl mb-2">🔔</p>
          <p className="text-sm">Aucune demande dans cette catégorie.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {demandes.map(d => {
            const meta = TYPE_META[d.type] || { icon: '📋', label: d.type, color: 'border-slate-300 bg-slate-50' };
            const expireAt = d.expire_at ? new Date(d.expire_at) : null;
            const expireBientot = expireAt && expireAt > new Date() && expireAt < new Date(Date.now() + 2*3600*1000);
            let metaData = {};
            try { metaData = d.meta ? (typeof d.meta === 'string' ? JSON.parse(d.meta) : d.meta) : {}; } catch {}
            const createdAtSafe = d.created_at ? (() => { try { return formatDistanceToNow(new Date(d.created_at), { addSuffix: true, locale: fr }); } catch { return ''; } })() : '';
            const dateCibleSafe = d.date_cible ? (() => { try { return format(new Date(d.date_cible+'T12:00:00'), 'EEEE d MMMM yyyy', { locale: fr }); } catch { return d.date_cible; } })() : '';
            const expireSafe = expireAt ? (() => { try { return formatDistanceToNow(expireAt, { addSuffix: true, locale: fr }); } catch { return ''; } })() : '';

            return (
              <div key={d.id} className={`card p-4 border-l-4 ${meta.color}`}>
                {/* Header */}
                <div className="flex items-start gap-3">
                  <Avatar user={{ nom: d.employe_nom?.split(' ').slice(-1)[0]||'', prenom: d.employe_nom?.split(' ')[0]||'', photo_url: d.photo_url }} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-700">{d.employe_nom}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-500">{meta.icon} {meta.label}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUT_CLS[d.statut]}`}>{d.statut.replace('_', ' ')}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{createdAtSafe}</p>
                  </div>
                  {d.statut === 'en_attente' && (
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => traiter(d.id, 'approuvee', d)} className="btn-success text-xs py-1.5 px-3">✓ Approuver</button>
                      <button onClick={() => traiter(d.id, 'refusee', d)} className="btn-danger text-xs py-1.5 px-3">✕ Refuser</button>
                    </div>
                  )}
                </div>

                {/* Détails selon le type */}
                <div className="mt-3 px-3 py-2.5 bg-white rounded-lg border border-slate-100 space-y-1">
                  {d.date_cible && dateCibleSafe && (
                    <p className="text-xs text-slate-500">
                      📅 Date concernée : <strong>{dateCibleSafe}</strong>
                    </p>
                  )}
                  {d.type === 'mouvement_caisse' && metaData.montant && (
                    <p className="text-xs text-slate-500">
                      {metaData.type_mouvement === 'ajout' ? '➕' : '➖'} Montant : <strong>{parseInt(metaData.montant).toLocaleString('fr')} FCFA</strong>
                      {metaData.mois && <span className="ml-1 text-slate-400">({metaData.mois})</span>}
                    </p>
                  )}
                  {d.type === 'encaissement' && metaData.montant && (
                    <p className="text-xs text-slate-500">
                      💰 Versement : <strong>{parseInt(metaData.montant).toLocaleString('fr')} FCFA</strong>
                      {metaData.mois && <span className="ml-1 text-slate-400">({metaData.mois})</span>}
                    </p>
                  )}
                  {d.type === 'annulation_reste' && metaData.reste && (
                    <p className="text-xs text-slate-500">
                      🤝 Reste à annuler : <strong className="text-amber-700">{parseInt(metaData.reste).toLocaleString('fr')} FCFA</strong>
                      {metaData.client_numero && <span className="ml-1 text-slate-400">(Client {metaData.client_numero})</span>}
                    </p>
                  )}
                  <p className="text-sm text-slate-700 font-medium">"{d.motif}"</p>
                </div>

                {expireAt && d.statut === 'approuvee' && expireSafe && (
                  <p className={`text-xs mt-2 font-medium ${expireBientot ? 'text-red-500' : 'text-water-600'}`}>
                    ⏱ Fenêtre de modification expire {expireSafe}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
