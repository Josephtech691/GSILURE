import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../../lib/api';
import { useToast, ToastDisplay } from '../../components/ui/Toast';

const TYPES = {
  modification_journee: 'Modification de journée',
  annulation_reste: 'Annulation de reste',
  mouvement_caisse: 'Mouvement de caisse',
  encaissement: 'Versement au patron',
};

const STATUTS = {
  en_attente: 'En attente',
  approuvee: 'Approuvée',
  refusee: 'Refusée',
};

export default function EmployeDemandes() {
  const [demandes, setDemandes] = useState([]);
  const [filtre, setFiltre] = useState('en_attente');
  const [loading, setLoading] = useState(true);
  const { toast, show } = useToast();

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/ventes/mes-demandes');
      setDemandes(Array.isArray(r.data) ? r.data : []);
    } catch (err) {
      show(err.response?.data?.message || 'Impossible de charger les demandes.', 'error');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const liste = demandes.filter(d => !filtre || d.statut === filtre);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <ToastDisplay toast={toast} />
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Mes demandes</h1>
          <p className="text-sm text-slate-500">Suivez les demandes envoyées au patron.</p>
        </div>
        <button onClick={charger} className="btn-secondary text-xs">↻ Actualiser</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {[['en_attente','⏳ En attente'],['approuvee','✓ Approuvées'],['refusee','✕ Refusées'],['','Toutes']].map(([value,label]) => (
          <button key={value} onClick={() => setFiltre(value)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${filtre === value ? 'bg-ocean-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
            {label} {value === 'en_attente' ? `(${demandes.filter(d => d.statut === value).length})` : ''}
          </button>
        ))}
      </div>
      {loading ? <div className="py-12 text-center text-slate-400">Chargement…</div> :
        liste.length === 0 ? <div className="card p-10 text-center text-slate-400">Aucune demande dans cette catégorie.</div> :
        <div className="space-y-3">
          {liste.map(d => (
            <article key={d.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-800">{TYPES[d.type] || d.type}</p>
                  <p className="text-xs text-slate-400 mt-1">{d.created_at ? format(new Date(d.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr }) : ''}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${d.statut === 'approuvee' ? 'bg-green-100 text-green-700' : d.statut === 'refusee' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  {STATUTS[d.statut] || d.statut}
                </span>
              </div>
              {d.type === 'encaissement' && d.meta && (
                <p className="mt-2 text-sm text-slate-600">Montant : {Number((typeof d.meta === 'string' ? JSON.parse(d.meta) : d.meta).montant || 0).toLocaleString('fr-FR')} FCFA</p>
              )}
              <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{d.commentaire_demande || d.motif || 'Aucun commentaire.'}</p>
            </article>
          ))}
        </div>}
    </div>
  );
}
