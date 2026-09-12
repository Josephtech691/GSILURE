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
    if (dateFin < dateDebut) { setErreur('La date de fin doit être après la date de début.'); return; }
    setLoading(true);
    try {
      const res = await api.get(`/rapports/generer?date_debut=${dateDebut}&date_fin=${dateFin}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-${dateDebut}-au-${dateFin}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      let message = 'Erreur lors de la génération du rapport.';
      if (err.response?.data instanceof Blob) {
        try {
          const texte = await err.response.data.text();
          const json = JSON.parse(texte);
          message = json.message || message;
        } catch { /* le corps n'était pas du JSON, on garde le message générique */ }
      } else if (err.response?.data?.message) {
        message = err.response.data.message;
      }
      console.error('Erreur rapport:', err);
      setErreur(message);
    } finally { setLoading(false); }
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
          {loading ? 'Génération en cours…' : '📥 Générer et télécharger le PDF'}
        </button>
      </div>
    </div>
  );
}
