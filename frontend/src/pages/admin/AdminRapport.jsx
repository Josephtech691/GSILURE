import { useState } from 'react';
import api from '../../lib/api';

const todayStr = () => new Date().toISOString().split('T')[0];

export default function AdminRapport() {
  const [dateDebut, setDateDebut] = useState(todayStr());
  const [dateFin, setDateFin] = useState(todayStr());
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');

const genererRapport = async () => {
  setErreur('');

  if (dateFin < dateDebut) {
    setErreur('La date de fin doit être après la date de début.');
    return;
  }

  setLoading(true);

  try {
    const res = await api.get(
      `/rapports/generer?date_debut=${encodeURIComponent(dateDebut)}&date_fin=${encodeURIComponent(dateFin)}`,
      {
        responseType: 'text',
      }
    );

    // Le backend renvoie du HTML, pas un PDF
    const blob = new Blob([res.data], {
      type: 'text/html;charset=utf-8',
    });

    const url = window.URL.createObjectURL(blob);

    // Afficher le rapport HTML
    window.location.href = url;

  } catch (err) {
    console.error('Erreur rapport:', err);

    let message = 'Erreur lors de la génération du rapport.';

    if (typeof err.response?.data === 'string') {
      try {
        const data = JSON.parse(err.response.data);
        message = data.message || message;
      } catch {
        // La réponse n'est pas du JSON
      }
    } else if (err.response?.data?.message) {
      message = err.response.data.message;
    }

    setErreur(message);
    setLoading(false);
  }
};

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold text-slate-800">📄 Rapport</h1>
      <div className="card p-5 space-y-4">
        <p className="text-sm text-slate-500">
          Choisis une période : le rapport PDF récapitulera le stock déposé, les ventes détaillées jour par jour,
          les totaux, les mouvements de caisse et le récapitulatif final (pertes incluses).
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Date de début</label>
            <input type="date" value={dateDebut} max={todayStr()} onChange={e => setDateDebut(e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Date de fin</label>
            <input type="date" value={dateFin} max={todayStr()} onChange={e => setDateFin(e.target.value)} className="input" />
          </div>
        </div>
        {erreur && <p className="text-sm text-red-600">{erreur}</p>}
        <button onClick={genererRapport} disabled={loading} className="btn-primary w-full py-3 justify-center">
          {loading ? 'Génération en cours…' : '📄 Générer le rapport'}
        </button>
        <p className="text-xs text-slate-400 text-center">
          Le rapport s'ouvre dans cet onglet. Utilise le bouton "🖨️ Imprimer" en haut du rapport
          (ou le menu Partager → Imprimer sur iPhone) puis choisis "Enregistrer en PDF".
        </p>
      </div>
    </div>
  );
}
