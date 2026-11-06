import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { formatSafeDate } from '../../lib/date';
import { fr } from 'date-fns/locale';
import api from '../../lib/api';
import Chat from '../../components/chat/Chat';
import Avatar from '../../components/ui/Avatar';
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
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

function datesPourFiltre(filtre, decalage = 0) {
  const now = new Date();
  const debut = new Date(now);
  const fin = new Date(now);
  if (filtre === 'semaine') {
    const jour = (now.getDay() + 6) % 7;
    debut.setDate(now.getDate() - jour - 7 * decalage);
    fin.setTime(debut.getTime());
    fin.setDate(debut.getDate() + 6);
  } else if (filtre === 'mois') {
    debut.setDate(1);
    debut.setMonth(now.getMonth() - decalage);
    fin.setFullYear(debut.getFullYear(), debut.getMonth() + 1, 0);
  } else {
    debut.setMonth(0, 1);
    debut.setFullYear(now.getFullYear() - decalage);
    fin.setFullYear(now.getFullYear() - decalage, 11, 31);
  }
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (decalage === 0) fin.setTime(now.getTime());
  return { debut: iso(debut), fin: iso(fin) };
}

export default function AdminDashboard() {
  const [date, setDate] = useState(todayStr());
  const [employes, setEmployes] = useState([]);
  const [filtreEmploye, setFiltreEmploye] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [graphFiltre, setGraphFiltre] = useState('mois');
  const [graphDebut, setGraphDebut] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; });
  const [graphFin, setGraphFin] = useState(todayStr());
  const [graphData, setGraphData] = useState({ ventes: [], employes: [], produits: [], poids_vendus: [], employes_par_jour: [], poids_erreur: null });
  const [graphErreurServeur, setGraphErreurServeur] = useState(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [typeGraphCA, setTypeGraphCA] = useState('line');
  const [graphPoidsFiltre, setGraphPoidsFiltre] = useState('journee');
  const [graphPoidsDate, setGraphPoidsDate] = useState(todayStr());
  const [graphPoidsType, setGraphPoidsType] = useState('pie');
  const [graphPoidsDebut, setGraphPoidsDebut] = useState(() => `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-01`);
  const [graphPoidsFin, setGraphPoidsFin] = useState(todayStr());
  const [graphPoidsData, setGraphPoidsData] = useState({ poids_vendus: [], kg_vendus_par_bac: [], poids_erreur: null });
  const [graphComparaisonFiltre, setGraphComparaisonFiltre] = useState('semaine');
  const [graphComparaisonDebut, setGraphComparaisonDebut] = useState(() => `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-01`);
  const [graphComparaisonFin, setGraphComparaisonFin] = useState(todayStr());
  const [graphComparaisonType, setGraphComparaisonType] = useState('line');
  const [graphComparaisonData, setGraphComparaisonData] = useState([]);
  const [graphComparaisonLoading, setGraphComparaisonLoading] = useState(false);
  const [beneficeKgSaisi, setBeneficeKgSaisi] = useState(() => localStorage.getItem('gsilure_benefice_kg') || '');
  const [beneficeKg, setBeneficeKg] = useState(() => Number(localStorage.getItem('gsilure_benefice_kg') || 0));
  // Filtre et données autonomes du graphique Bénéfice.
  const [graphBeneficeFiltre, setGraphBeneficeFiltre] = useState('mois');
  const [graphBeneficeDebut, setGraphBeneficeDebut] = useState(() => `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-01`);
  const [graphBeneficeFin, setGraphBeneficeFin] = useState(todayStr());
  const [graphBeneficeData, setGraphBeneficeData] = useState({ jours: [], totalArgent: 0, kg: 0 });
  const [graphBeneficeLoading, setGraphBeneficeLoading] = useState(false);

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

  // Filtre analytique : semaine, mois, année ou période personnalisée.
  useEffect(() => {
    const now = new Date();
    const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    let debut = graphDebut;
    let fin = graphFin;
    if (graphFiltre !== 'periode') {
      fin = iso(now);
      if (graphFiltre === 'semaine') { const d = new Date(now); const jour = (d.getDay() + 6) % 7; d.setDate(d.getDate() - jour); debut = iso(d); }
      else if (graphFiltre === 'mois') debut = iso(new Date(now.getFullYear(), now.getMonth(), 1));
      else if (graphFiltre === 'annee') debut = iso(new Date(now.getFullYear(), 0, 1));
    }
    if (!debut || !fin || debut > fin) return;
    const params = new URLSearchParams({ date_debut: debut, date_fin: fin });
    setGraphLoading(true);
    setGraphErreurServeur(null);
    api.get(`/ventes/admin-graphiques?${params}`)
      .then(r => {
        setGraphData({ ventes: r.data?.ventes || [], employes: r.data?.employes || [], produits: r.data?.produits || [], poids_vendus: r.data?.poids_vendus || [], employes_par_jour: r.data?.employes_par_jour || [], poids_erreur: r.data?.poids_erreur || null });
        setGraphErreurServeur(null);
      })
      .catch(err => {
        const payload = err?.response?.data;
        const diagnostic = payload?.erreur || {};
        const message = diagnostic.message || payload?.message || err.message || 'Erreur inconnue lors du chargement du dashboard.';
        setGraphErreurServeur({ message, code: diagnostic.code, detail: diagnostic.detail, hint: diagnostic.hint, status: err?.response?.status });
        console.error('Chargement graphiques admin:', { message, code: diagnostic.code, detail: diagnostic.detail, hint: diagnostic.hint, status: err?.response?.status });
        setGraphData({ ventes: [], employes: [], produits: [], poids_vendus: [], employes_par_jour: [], poids_erreur: null });
      })
      .finally(() => setGraphLoading(false));
  }, [graphFiltre, graphDebut, graphFin]);

  // Filtre indépendant du graphique de répartition des poids.
  useEffect(() => {
    const dates = graphPoidsFiltre === 'periode'
      ? { debut: graphPoidsDebut, fin: graphPoidsFin }
      : graphPoidsFiltre === 'journee' ? { debut: graphPoidsDate, fin: graphPoidsDate }
      : datesPourFiltre(graphPoidsFiltre);
    if (!dates.debut || !dates.fin || dates.debut > dates.fin) return;
    const params = new URLSearchParams({ date_debut: dates.debut, date_fin: dates.fin });
    api.get(`/ventes/admin-graphiques?${params}`)
      .then(r => setGraphPoidsData({ poids_vendus: r.data?.poids_vendus || [], kg_vendus_par_bac: r.data?.kg_vendus_par_bac || [], poids_erreur: r.data?.poids_erreur || null }))
      .catch(err => {
        const e = err?.response?.data?.erreur || {};
        setGraphPoidsData({ poids_vendus: [], kg_vendus_par_bac: [], poids_erreur: { message: e.message || err.message, code: e.code, detail: e.detail, hint: e.hint } });
      });
  }, [graphPoidsFiltre, graphPoidsDate, graphPoidsDebut, graphPoidsFin]);

  // Compare les 4 périodes sous forme de séries distinctes :
  // chaque courbe représente une semaine, un mois ou une année.
  useEffect(() => {
    let annule = false;
    setGraphComparaisonLoading(true);
    const couleursComparaison = ['#94a3b8', '#0ea5e9', '#f59e0b', '#0d937c'];
    if (graphComparaisonFiltre === 'periode') {
      if (!graphComparaisonDebut || !graphComparaisonFin || graphComparaisonDebut > graphComparaisonFin) {
        setGraphComparaisonData({ rows: [], series: [] });
        setGraphComparaisonLoading(false);
        return () => { annule = true; };
      }
      const params = new URLSearchParams({ date_debut: graphComparaisonDebut, date_fin: graphComparaisonFin });
      api.get(`/ventes/admin-graphiques?${params}`).then(r => {
        if (annule) return;
        const ventes = r.data?.ventes || [];
        const parJour = new Map();
        ventes.forEach(v => {
          const key = String(v.date).slice(0, 10);
          parJour.set(key, (parJour.get(key) || 0) + Number(v.ca || 0));
        });
        const rows = [...parJour.entries()].sort((a,b) => a[0].localeCompare(b[0])).map(([jour, ca]) => ({ point: new Date(`${jour}T12:00:00`).toLocaleDateString('fr-FR'), 'Période choisie': ca, maxCA: ca, valuesSorted: [{ nom: 'Période choisie', couleur: '#0ea5e9', valeur: ca }] }));
        setGraphComparaisonData({ rows, series: [{ nom: 'Période choisie', couleur: '#0ea5e9' }] });
      }).catch(err => {
        console.error('Comparaison personnalisée du chiffre d’affaires:', err);
        if (!annule) setGraphComparaisonData({ rows: [], series: [] });
      }).finally(() => { if (!annule) setGraphComparaisonLoading(false); });
      return () => { annule = true; };
    }
    const libellePeriode = (decalage, debut) => {
      if (graphComparaisonFiltre === 'semaine') {
        return decalage === 0 ? 'Cette semaine' : 'Semaine passée';
      }
      if (graphComparaisonFiltre === 'mois') {
        return decalage === 0 ? 'Ce mois-ci' : 'Mois passé';
      }
      return decalage === 0 ? 'Cette année' : 'Année passée';
    };
    Promise.all([1, 0].map(async decalage => {
      let { debut, fin } = datesPourFiltre(graphComparaisonFiltre, decalage);
      if (graphComparaisonFiltre === 'semaine') {
        // Semaine civile : du lundi au dimanche.
        const now = new Date();
        const lundi = new Date(now);
        const joursDepuisLundi = (now.getDay() + 6) % 7; // 0 = lundi
        lundi.setDate(now.getDate() - joursDepuisLundi - (7 * decalage));
        const dimanche = new Date(lundi);
        dimanche.setDate(lundi.getDate() + 6);
        const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        debut = iso(lundi); fin = iso(dimanche);
        if (decalage === 0 && fin > todayStr()) fin = todayStr();
      }
      const params = new URLSearchParams({ date_debut: debut, date_fin: fin });
      const r = await api.get(`/ventes/admin-graphiques?${params}`);
      const serie = {};
      (r.data?.ventes || []).forEach(v => {
        const d = new Date(`${String(v.date).slice(0, 10)}T12:00:00`);
        let index;
        if (graphComparaisonFiltre === 'semaine') {
          const debutPeriode = new Date(`${debut}T12:00:00`);
          index = Math.round((d - debutPeriode) / 86400000); // 7 jours, du lundi au dimanche
        } else if (graphComparaisonFiltre === 'mois') {
          index = d.getDate() - 1;
        } else {
          index = d.getMonth();
        }
        serie[index] = (serie[index] || 0) + Number(v.ca || 0);
      });
      return {
        decalage,
        nom: libellePeriode(decalage, debut),
        couleur: couleursComparaison[3 - decalage],
        serie
      };
    })).then(series => {
      if (annule) return;
      const nombrePoints = graphComparaisonFiltre === 'semaine' ? 7 : graphComparaisonFiltre === 'mois' ? 31 : 12;
      const etiquettes = graphComparaisonFiltre === 'semaine'
        ? ['Ven', 'Sam', 'Dim', 'Lun', 'Mar', 'Mer', 'Jeu']
        : graphComparaisonFiltre === 'mois'
          ? Array.from({ length: 31 }, (_, i) => String(i + 1))
          : ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
      const rows = Array.from({ length: nombrePoints }, (_, i) => {
        const row = { point: etiquettes[i] };
        series.forEach(serie => { row[serie.nom] = serie.serie[i] || 0; });
        // Classement propre à chaque jour/mois : les montants les plus élevés
        // sont dessinés en premier, puis les plus petits par-dessus.
        row.valuesSorted = [...series]
          .map(serie => ({ nom: serie.nom, couleur: serie.couleur, valeur: Number(serie.serie[i] || 0) }))
          .sort((a, b) => b.valeur - a.valeur);
        row.maxCA = Math.max(0, ...row.valuesSorted.map(item => item.valeur));
        return row;
      });
      setGraphComparaisonData({ rows: [{ point: 'Départ (0)', ...Object.fromEntries(series.map(serie => [serie.nom, 0])), maxCA: 0, valuesSorted: [] }, ...rows], series });
    }).catch(err => {
      console.error('Comparaison du chiffre d’affaires:', err);
      if (!annule) setGraphComparaisonData({ rows: [], series: [] });
    }).finally(() => { if (!annule) setGraphComparaisonLoading(false); });
    return () => { annule = true; };
  }, [graphComparaisonFiltre, graphComparaisonDebut, graphComparaisonFin]);

  // Le bénéfice possède son propre filtre et son propre chargement API.
  useEffect(() => {
    const dates = graphBeneficeFiltre === 'periode'
      ? { debut: graphBeneficeDebut, fin: graphBeneficeFin }
      : datesPourFiltre(graphBeneficeFiltre);
    if (!dates.debut || !dates.fin || dates.debut > dates.fin) return;
    let annule = false;
    setGraphBeneficeLoading(true);
    const params = new URLSearchParams({ date_debut: dates.debut, date_fin: dates.fin });
    api.get(`/ventes/admin-graphiques?${params}`)
      .then(r => {
        if (annule) return;
        const ventesParJour = new Map();
        (r.data?.ventes || []).forEach(v => {
          const key = String(v.date).slice(0, 10);
          ventesParJour.set(key, (ventesParJour.get(key) || 0) + Number(v.ca || 0));
        });
        const ajoutsParJour = new Map();
        (r.data?.ajouts_caisse || []).forEach(a => {
          const key = String(a.date).slice(0, 10);
          ajoutsParJour.set(key, (ajoutsParJour.get(key) || 0) + Number(a.montant || 0));
        });
        const datesSet = new Set([...ventesParJour.keys(), ...ajoutsParJour.keys()]);
        const jours = [...datesSet].sort().map(jour => {
          const ventes = ventesParJour.get(jour) || 0;
          const ajouts = ajoutsParJour.get(jour) || 0;
          const argent = ventes + ajouts;
          return { date: jour, date_label: new Date(`${jour}T12:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), ventes, ajouts, argent, kg_convertis: argent / 2500, benefice: (argent / 2500) * beneficeKg };
        });
        const totalArgent = jours.reduce((sum, j) => sum + j.argent, 0);
        setGraphBeneficeData({ jours, totalArgent, kg: totalArgent / 2500 });
      })
      .catch(err => { console.error('Chargement graphique bénéfice:', err); if (!annule) setGraphBeneficeData({ jours: [], totalArgent: 0, kg: 0 }); })
      .finally(() => { if (!annule) setGraphBeneficeLoading(false); });
    return () => { annule = true; };
  }, [graphBeneficeFiltre, graphBeneficeDebut, graphBeneficeFin, beneficeKg]);

  const validerBeneficeKg = () => {
    const montant = Number(beneficeKgSaisi);
    if (!Number.isFinite(montant) || montant < 0) {
      alert('Saisis un bénéfice par kilogramme valide (montant positif ou nul).');
      return;
    }
    localStorage.setItem('gsilure_benefice_kg', String(montant));
    setBeneficeKg(montant);
  };

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

  // Caisse totale = somme simple des caisses individuelles des employés.
  // Aucun stock, caisse de départ ou autre montant n'est ajouté.
  const caisseTotal = casse.reduce((total, emp) => {
    const caisseBrute =
      parseFloat(emp.total_encaisse_ventes||0) +
      parseFloat(emp.total_ajouts||0) -
      parseFloat(emp.total_retraits||0);
    const caisseNette =
      caisseBrute - parseFloat(emp.total_verse_patron||0);
    return total + Math.max(0, caisseNette);
  }, 0);

  // Calcul argent retiré depuis dataRetire
  const retireMois  = dataRetire || data;
  const ccMois = retireMois?.caisse_cumulee || {};
  const mmMois = retireMois?.totaux_mois    || {};
  const argentRetireMois  = parseInt(mmMois.retraits||0) + parseInt(mmMois.encaissements||0);

  const retireAnnee = dataRetire || data;
  const ccAnnee = retireAnnee?.caisse_cumulee || {};
  const argentRetireAnnee = parseInt(ccAnnee.retraits||0) + parseInt(ccAnnee.encaissements||0);

  const moisOptions = getMoisOptions();

  const couleurCA = '#f97316';
  const couleurKg = '#38bdf8';
  // Agrégats journaliers : le graphique présente désormais les ventes globales,
  // sans ventilation ni pourcentage par employé.
  const graphSeriesData = [{ date_label: 'Départ (0)', date: 'Départ (0)', ca_total: 0, kg_total: 0 }, ...(graphData.ventes || []).map(jour => ({
    ...jour,
    ca_total: Number(jour.ca || 0),
    kg_total: Number(jour.kg || 0),
  }))];
  const caTotalPeriode = graphSeriesData.reduce((sum, jour) => sum + jour.ca_total, 0);
  const kgTotalPeriode = graphSeriesData.reduce((sum, jour) => sum + jour.kg_total, 0);

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
            
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ═══ CAISSE TOTALE ═══ */}
      <div className="card p-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">💰 Caisse totale</h2>
            <p className="text-xs text-slate-400 mt-0.5">Somme des caisses détenues par tous les employés</p>
          </div>
          <p className="text-3xl font-bold text-water-700">
            {parseInt(caisseTotal).toLocaleString('fr')} F
          </p>
        </div>
      </div>

      {/* ═══ STOCK ═══ */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-600 mb-4">📦 État du stock global</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-700">{parseFloat(stock.total_kg_achete||0).toFixed(1)}</p>
            <p className="text-xs text-slate-400 mt-0.5">kg achetés</p>
            <p className="text-xs text-slate-400 mt-0.5">{(Math.round(parseFloat(stock.total_kg_achete||0)*10)/10*2500).toLocaleString('fr')} F</p>
          </div>
          <div className="text-center border-x border-slate-100">
            <p className="text-2xl font-bold text-ocean-700">{parseFloat(stock.total_kg_vendu||0).toFixed(1)}</p>
            <p className="text-xs text-slate-400 mt-0.5">kg vendus</p>
            <p className="text-xs text-slate-400 mt-0.5">{(Math.round(parseFloat(stock.total_kg_vendu||0)*10)/10*2500).toLocaleString('fr')} F</p>
          </div>
          <div className={`text-center ${parseFloat(stock.reste_kg||0)<20?'text-red-600':'text-water-700'}`}>
            <p className="text-2xl font-bold">{parseFloat(stock.reste_kg||0).toFixed(1)}</p>
            <p className="text-xs text-slate-400 mt-0.5">kg restants</p>
            <p className="text-xs text-slate-400 mt-0.5">{(Math.round(parseFloat(stock.reste_kg||0)*10)/10*2500).toLocaleString('fr')} F</p>
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
      </div>

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
                    <span className={`text-xs font-bold px-2 py-0.5 rounded whitespace-nowrap ${c.client_nom==='INCONNU'?'bg-slate-100 text-slate-400':'bg-amber-100 text-amber-800'}`}>{c.client_nom || 'INCONNU'}</span>
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
          <h2 className="text-sm font-semibold text-slate-600">💼 Caisses des employés principaux</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {casse.map(emp => {
            // La caisse est toujours calculée sur les totaux globaux.
            // L'état de la période ne doit influencer que les indicateurs
            // Théorique / Versé / Retrait affichés plus bas.
            const casseBrute =
              parseFloat(emp.total_encaisse_ventes||0) +
              parseFloat(emp.total_ajouts||0) -
              parseFloat(emp.total_retraits||0);
            const casseNette =
              casseBrute - parseFloat(emp.total_verse_patron||0);
            return (
              <div key={emp.employe_id} className="flex items-center px-5 py-3 gap-4">
                <Avatar user={{ nom:emp.employe_nom?.split(' ').slice(-1)[0]||'', prenom:emp.employe_nom?.split(' ')[0]||'' }} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700">{emp.employe_nom}</p>
                  <p className="text-xs text-slate-400">
                    {periodeActive ? `Théorique période : ${parseInt(emp.periode_theorique||0).toLocaleString('fr')} F` : `Théorique : ${parseInt(emp.total_valeur_theorique||0).toLocaleString('fr')} F`}
                    {(periodeActive ? parseFloat(emp.periode_verse_patron||0) : parseFloat(emp.total_verse_patron||0))>0 && <span className="ml-2 text-purple-500">· Versé -: {parseInt(periodeActive ? emp.periode_verse_patron : emp.total_verse_patron).toLocaleString('fr')} F</span>}
                  </p> {((periodeActive ? parseFloat(emp.periode_retraits||0) : parseFloat(emp.total_retraits||0))>0) &&
                  <p className="text-xs text-slate-400">
                    Retraits divers : -{parseInt(periodeActive ? emp.periode_retraits : emp.total_retraits).toLocaleString('fr')} F</p>}
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

      {/* GRAPHIQUES ANALYTIQUES */}
      <section className="space-y-4 min-w-0 w-full">
        <div className="min-w-0"><h2 className="text-base font-bold text-slate-800">📊 Analyse des ventes</h2><p className="text-xs text-slate-500 mt-1">Chaque graphique possède son propre filtre de dates.</p></div>
        {graphLoading && <p className="text-xs text-slate-400">Actualisation des graphiques…</p>}
        <div className="grid grid-cols-1 gap-3 sm:gap-4 min-w-0">
          <div className="min-w-0 overflow-hidden rounded-xl border border-slate-700 bg-[#303639] p-2 sm:p-4 text-white">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <strong className="mr-auto text-xs sm:text-sm">Performance des employés et CA</strong>
              <select aria-label="Filtre du graphique de performance" value={graphFiltre} onChange={e => setGraphFiltre(e.target.value)} className="rounded-lg border border-slate-500 bg-slate-800 px-2 py-1.5 text-xs text-white"><option value="semaine">Semaine</option><option value="mois">Mois</option><option value="annee">Année</option><option value="periode">Période personnalisée</option></select>
              {graphFiltre === 'periode' && <>
                <input aria-label="Début performance" type="date" value={graphDebut} max={graphFin || todayStr()} onChange={e => setGraphDebut(e.target.value)} className="rounded-lg border border-slate-500 bg-slate-800 px-2 py-1.5 text-xs text-white" />
                <input aria-label="Fin performance" type="date" value={graphFin} min={graphDebut} max={todayStr()} onChange={e => setGraphFin(e.target.value)} className="rounded-lg border border-slate-500 bg-slate-800 px-2 py-1.5 text-xs text-white" />
              </>}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div className="rounded-xl border border-sky-400/30 bg-sky-500/10 p-3 sm:p-4">
                <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-sky-200">Kg vendus</p>
                <p className="mt-1 text-xl sm:text-3xl font-bold text-white">{kgTotalPeriode.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg</p>
              </div>
              <div className="rounded-xl border border-orange-400/30 bg-orange-500/10 p-3 sm:p-4">
                <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-orange-200">Chiffre d’affaires</p>
                <p className="mt-1 text-xl sm:text-3xl font-bold text-white">{caTotalPeriode.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA</p>
              </div>
            </div>
            <div className="mt-3 sm:mt-6 border-t border-slate-500/70 pt-2 sm:pt-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs sm:text-base font-bold">Évolution du chiffre d’affaires et des kg vendus</h3>
                <div className="flex rounded-lg border border-slate-500 overflow-hidden shrink-0">
                  {['line','bar'].map(type => <button key={type} type="button" onClick={() => setTypeGraphCA(type)} className={`px-2 py-1 text-[10px] sm:text-xs ${typeGraphCA === type ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-200'}`}>{type === 'line' ? '📈 Courbe' : '📊 Bâtons'}</button>)}
                </div>
                <span className="text-[8px] sm:text-xs text-slate-300">
                  CA total encaissé : {caTotalPeriode.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} F
                </span>
              </div>
              <div className="h-44 sm:h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  {typeGraphCA === 'line' ? <LineChart data={graphSeriesData} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
                    <CartesianGrid stroke="#697176" strokeDasharray="2 3" vertical />
                    <XAxis dataKey="date_label" tick={{ fontSize: 9, fill: '#f1f5f9' }} tickMargin={4} minTickGap={12} axisLine={{ stroke: '#94a3b8' }} tickLine={false} />
                    <YAxis yAxisId="ca" orientation="left" tick={{ fontSize: 9, fill: '#fdba74' }} width={58} axisLine={{ stroke: couleurCA }} tickLine={{ stroke: couleurCA }} tickFormatter={v => Number(v).toLocaleString('fr-FR', { notation: 'compact', maximumFractionDigits: 1 })} domain={[0, 'auto']} />
                    <YAxis yAxisId="kg" orientation="right" tick={{ fontSize: 9, fill: '#7dd3fc' }} width={48} axisLine={{ stroke: couleurKg }} tickLine={{ stroke: couleurKg }} tickFormatter={v => `${Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}`} domain={[0, 'auto']} />
                    <Tooltip contentStyle={{ backgroundColor: '#252a2d', border: '1px solid #64748b', borderRadius: 8, color: '#fff', fontSize: 11 }} formatter={(v, name) => [name === 'Kg vendus' ? `${Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg` : `${Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA`, name]} />
                    <Line yAxisId="ca" type="linear" dataKey="ca_total" name="Chiffre d’affaires" stroke={couleurCA} strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                    <Line yAxisId="kg" type="linear" dataKey="kg_total" name="Kg vendus" stroke={couleurKg} strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                  </LineChart> : <BarChart data={graphSeriesData} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
                    <CartesianGrid stroke="#697176" strokeDasharray="2 3" vertical />
                    <XAxis dataKey="date_label" tick={{ fontSize: 9, fill: '#f1f5f9' }} tickMargin={4} minTickGap={12} axisLine={{ stroke: '#94a3b8' }} tickLine={false} />
                    <YAxis yAxisId="ca" orientation="left" tick={{ fontSize: 9, fill: '#fdba74' }} width={58} tickFormatter={v => Number(v).toLocaleString('fr-FR', { notation: 'compact', maximumFractionDigits: 1 })} domain={[0, 'auto']} />
                    <YAxis yAxisId="kg" orientation="right" tick={{ fontSize: 9, fill: '#7dd3fc' }} width={48} tickFormatter={v => Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} domain={[0, 'auto']} />
                    <Tooltip contentStyle={{ backgroundColor: '#252a2d', border: '1px solid #64748b', borderRadius: 8, color: '#fff', fontSize: 11 }} formatter={(v, name) => [name === 'Kg vendus' ? `${Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg` : `${Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA`, name]} />
                    <Bar yAxisId="ca" dataKey="ca_total" name="Chiffre d’affaires" fill={couleurCA} />
                    <Bar yAxisId="kg" dataKey="kg_total" name="Kg vendus" fill={couleurKg} />
                  </BarChart>}
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                <span className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-100"><span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: couleurCA }} /> Chiffre d’affaires (FCFA)</span>
                <span className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-100"><span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: couleurKg }} /> Kg vendus</span>
              </div>
            </div>
          </div>
          <div className="card p-3 sm:p-5 min-w-0 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div><h3 className="text-base sm:text-lg font-bold text-slate-800">📈 Comparaison du chiffre d’affaires</h3><p className="text-xs text-slate-500 mt-1">Période actuelle comparée à la période précédente.</p></div>
              <div className="flex flex-wrap gap-2">
                <select aria-label="Filtre du graphique de comparaison" value={graphComparaisonFiltre} onChange={e => setGraphComparaisonFiltre(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600"><option value="semaine">Semaine</option><option value="mois">Mois</option><option value="annee">Année</option><option value="periode">Période personnalisée</option></select>
                {graphComparaisonFiltre === 'periode' && <><input aria-label="Début comparaison" type="date" value={graphComparaisonDebut} max={graphComparaisonFin || todayStr()} onChange={e => setGraphComparaisonDebut(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600"/><input aria-label="Fin comparaison" type="date" value={graphComparaisonFin} min={graphComparaisonDebut} max={todayStr()} onChange={e => setGraphComparaisonFin(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600"/></>}
                <div className="flex rounded-lg border border-slate-200 overflow-hidden">{['bar','line'].map(type => <button key={type} type="button" onClick={() => setGraphComparaisonType(type)} className={`px-2 py-1 text-xs ${graphComparaisonType === type ? 'bg-ocean-600 text-white' : 'bg-white text-slate-600'}`}>{type === 'bar' ? '📊 Bâtons' : '📈 Courbe'}</button>)}</div>
              </div>
            </div>
            {graphComparaisonLoading ? <p className="py-8 text-center text-sm text-slate-400">Chargement de la comparaison…</p> : graphComparaisonData.rows?.length ? <div className="h-64 sm:h-72 w-full min-w-0"><ResponsiveContainer width="100%" height="100%">
              {graphComparaisonType === 'bar' ? <BarChart data={graphComparaisonData.rows} barCategoryGap="25%"><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="point" tick={{ fontSize: 10 }} interval={graphComparaisonFiltre === 'mois' ? 4 : graphComparaisonFiltre === 'periode' ? 'preserveStartEnd' : 0} /><YAxis tickFormatter={v => `${Math.round(v/1000)}k`} tick={{ fontSize: 10 }} /><Tooltip content={({ active, payload, label }) => active && payload?.length ? <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-xs"><p className="mb-2 font-semibold text-slate-700">{label}</p>{(payload[0]?.payload?.valuesSorted || []).map(item => <div key={item.nom} className="flex items-center justify-between gap-4 py-0.5"><span className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.couleur }} />{item.nom}</span><strong>{item.valeur.toLocaleString('fr-FR')} FCFA</strong></div>)}</div> : null} /><Legend content={() => <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 pt-2 text-[10px]">{graphComparaisonData.series.map(serie => <span key={serie.nom} className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: serie.couleur }} />{serie.nom}</span>)}</div>} /><Bar dataKey="maxCA" name="Comparaison des périodes" fill="transparent" isAnimationActive={false} shape={({ x, y, width, height, payload }) => { const values = payload?.valuesSorted || []; const baseline = y + height; const maxValue = Number(payload?.maxCA || 0); const barWidths = [width * 0.85, width * 0.5]; return <g>{values.map((item, index) => { if (!maxValue || item.valeur <= 0) return null; const barHeight = height * item.valeur / maxValue; const barWidth = Math.max(2, barWidths[index] || width * 0.2); return <rect key={item.nom} x={x + (width - barWidth) / 2} y={baseline - barHeight} width={barWidth} height={barHeight} fill={item.couleur} stroke="#ffffff" strokeWidth="0.5" />; })}</g>} } /></BarChart> : <LineChart data={graphComparaisonData.rows}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="point" tick={{ fontSize: 10 }} interval={graphComparaisonFiltre === 'mois' ? 4 : graphComparaisonFiltre === 'periode' ? 'preserveStartEnd' : 0} /><YAxis tickFormatter={v => `${Math.round(v/1000)}k`} tick={{ fontSize: 10 }} /><Tooltip formatter={v => [`${Number(v).toLocaleString('fr-FR')} FCFA`]} /><Legend />{graphComparaisonData.series.map(serie => <Line key={serie.nom} type="linear" dataKey={serie.nom} name={serie.nom} stroke={serie.couleur} strokeWidth={3} connectNulls dot={false} activeDot={{ r: 5 }} />)}</LineChart>}</ResponsiveContainer></div> : <p className="py-8 text-center text-sm text-slate-400">Aucune donnée de chiffre d’affaires pour ces périodes.</p>}
          </div>
          <div className="card p-3 sm:p-5 min-w-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3"><div><h3 className="text-base sm:text-lg font-bold text-slate-800">🐟 Répartition des poids vendus</h3><p className="text-xs sm:text-sm text-slate-500 mt-1">Pourcentage des kilogrammes vendus par catégorie de poids.</p></div><div className="flex flex-wrap items-center gap-2"><div className="flex rounded-lg border border-slate-200 overflow-hidden"><button type="button" onClick={() => setGraphPoidsType('pie')} className={`px-2 py-1 text-xs ${graphPoidsType === 'pie' ? 'bg-ocean-600 text-white' : 'bg-white text-slate-600'}`}>◉ Circulaire</button><button type="button" onClick={() => setGraphPoidsType('line')} className={`px-2 py-1 text-xs ${graphPoidsType === 'line' ? 'bg-ocean-600 text-white' : 'bg-white text-slate-600'}`}>📈 Courbe</button></div><select aria-label="Filtre du graphique des poids" value={graphPoidsFiltre} onChange={e => setGraphPoidsFiltre(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600"><option value="journee">Journée</option><option value="semaine">Semaine</option><option value="mois">Mois</option><option value="annee">Année</option><option value="periode">Période personnalisée</option></select>{graphPoidsFiltre === 'journee' && <input aria-label="Journée du graphique des poids" type="date" max={todayStr()} value={graphPoidsDate} onChange={e => setGraphPoidsDate(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600"/>}{graphPoidsFiltre === 'periode' && <><input aria-label="Début poids" type="date" value={graphPoidsDebut} max={graphPoidsFin || todayStr()} onChange={e => setGraphPoidsDebut(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600"/><input aria-label="Fin poids" type="date" value={graphPoidsFin} min={graphPoidsDebut} max={todayStr()} onChange={e => setGraphPoidsFin(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600"/></>}</div></div>
            {(() => {
              const poidsData = (graphPoidsData.poids_vendus || []).filter(p => Number(p.kg) > 0);
              const totalKgPoids = poidsData.reduce((sum, p) => sum + Number(p.kg || 0), 0);
              const couleursPoids = ['#f44336', '#ff9800', '#2196f3', '#d946ef', '#22c55e', '#eab308', '#06b6d4', '#8b5cf6', '#f97316'];
              return poidsData.length ? <div className="space-y-3"><div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-3">
                <div className="h-64 sm:h-72 min-w-0"><ResponsiveContainer width="100%" height="100%">{graphPoidsType === 'pie' ? <PieChart><Pie data={poidsData.map(p => ({ ...p, pourcentage: totalKgPoids ? Number(p.kg) / totalKgPoids * 100 : 0 }))} dataKey="kg" nameKey="poids_categorie" cx="50%" cy="50%" outerRadius="78%" paddingAngle={2} label={({ payload }) => `${Number(payload?.pourcentage || 0).toFixed(1)}%`} labelLine>{poidsData.map((p, i) => <Cell key={p.poids_categorie} fill={couleursPoids[i % couleursPoids.length]} />)}</Pie><Tooltip formatter={(v, name) => [`${Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg`, name]} /></PieChart> : <LineChart data={[{ poids_categorie: 'Départ (0)', kg: 0 }, ...poidsData]} margin={{ top: 12, right: 12, left: -12, bottom: 8 }}><CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" /><XAxis dataKey="poids_categorie" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip formatter={v => [`${Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg`, 'Poids vendu']} /><Line type="linear" dataKey="kg" name="Poids vendu" stroke="#0d937c" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} /></LineChart>}</ResponsiveContainer></div>
                <div className="space-y-2">{poidsData.map((p, i) => <div key={p.poids_categorie} className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2 min-w-0"><span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: couleursPoids[i % couleursPoids.length] }} /><span className="truncate">{p.poids_categorie}</span></span><span className="font-semibold text-slate-700 whitespace-nowrap">{Number(p.kg).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg</span><strong>{(Number(p.kg) / totalKgPoids * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}%</strong></div>)}</div>
              </div><div className="sm:col-span-2 border-t border-slate-100 pt-3 mt-1"><h4 className="text-xs font-semibold text-slate-600 mb-2">Kg vendus par bac</h4><div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{(graphPoidsData.kg_vendus_par_bac || []).filter(b => Number(b.kg) > 0).map(b => <div key={b.bac_numero} className="rounded-lg bg-slate-50 px-3 py-2 flex items-center justify-between text-xs"><span className="font-medium text-slate-600">Bac {b.bac_numero}</span><strong className="text-slate-800">{Number(b.kg).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg</strong></div>)}</div>{!(graphPoidsData.kg_vendus_par_bac || []).some(b => Number(b.kg) > 0) && <p className="text-xs text-slate-400">Aucune vente attribuée à un bac sur cette période.</p>}</div></div> : graphPoidsData.poids_erreur ? <div className="m-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p className="font-semibold">Erreur réelle du serveur — graphique des poids</p><p className="mt-1 break-words">{graphPoidsData.poids_erreur.message}</p>{graphPoidsData.poids_erreur.code && <p className="mt-1">Code PostgreSQL : <code>{graphPoidsData.poids_erreur.code}</code></p>}{graphPoidsData.poids_erreur.detail && <p className="mt-1 break-words">Détail : {graphPoidsData.poids_erreur.detail}</p>}{graphPoidsData.poids_erreur.hint && <p className="mt-1 break-words">Conseil : {graphPoidsData.poids_erreur.hint}</p>}</div> : <p className="py-10 text-center text-sm text-slate-400">Aucune vente avec une catégorie de poids renseignée sur cette période.</p>;
            })()}
          </div>
          <div className="relative card p-0 min-w-0 overflow-hidden border border-emerald-100 shadow-sm">
            <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-500 px-4 py-4 sm:px-5 text-white">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-xs font-semibold uppercase tracking-wider text-emerald-100">Analyse de rentabilité</p><h3 className="text-lg font-bold mt-1">Bénéfice estimé</h3><p className="text-xs text-emerald-50 mt-1">Estimation basée sur le bénéfice par kilogramme.</p></div>
                <span className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-xl" aria-hidden="true">↗</span>
              </div>
              <form className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-end gap-2" onSubmit={e => { e.preventDefault(); validerBeneficeKg(); }}>
                <div className="flex-1 min-w-0"><label htmlFor="benefice-kg" className="block text-xs font-medium text-emerald-50 mb-1">Bénéfice par kg (FCFA)</label><input id="benefice-kg" type="number" min="0" step="any" value={beneficeKgSaisi} onChange={e => setBeneficeKgSaisi(e.target.value)} placeholder="Ex. 500" className="w-full rounded-lg border border-white/30 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-200" required/></div>
                <button type="submit" className="rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-emerald-800 shadow-sm hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-white">Valider</button>
              </form>
            </div>
            <div className="p-3 sm:p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div><p className="text-xs text-slate-500">Filtre indépendant du bénéfice</p><div className="mt-1 flex flex-wrap items-center gap-2"><select aria-label="Filtre du graphique bénéfice" value={graphBeneficeFiltre} onChange={e => setGraphBeneficeFiltre(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600"><option value="semaine">Semaine</option><option value="mois">Mois</option><option value="annee">Année</option><option value="periode">Période personnalisée</option></select>{graphBeneficeFiltre === 'periode' && <><input aria-label="Début bénéfice" type="date" value={graphBeneficeDebut} max={graphBeneficeFin || todayStr()} onChange={e => setGraphBeneficeDebut(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600"/><input aria-label="Fin bénéfice" type="date" value={graphBeneficeFin} min={graphBeneficeDebut} max={todayStr()} onChange={e => setGraphBeneficeFin(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600"/></>}</div></div>
                {graphBeneficeLoading && <span className="text-xs text-slate-400">Actualisation…</span>}
              </div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div><p className="text-xs text-slate-500">Argent ventes + ajouts en caisse</p><p className="text-sm font-bold text-slate-700">{graphBeneficeData.totalArgent.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} F CFA</p><p className="text-xs text-slate-500">Équivalent : {graphBeneficeData.kg.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg (2 500 F = 1 kg)</p><p className="text-xs text-slate-500 mt-1">Bénéfice estimé sur la période</p><p className="text-xl sm:text-2xl font-bold text-emerald-700">{(graphBeneficeData.kg * beneficeKg).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} F CFA</p></div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{beneficeKg.toLocaleString('fr-FR')} F/kg</span>
              </div>
              {graphBeneficeData.jours.length ? <div className="h-52 sm:h-60 w-full min-w-0"><ResponsiveContainer width="100%" height="100%"><LineChart data={[{ date_label: 'Départ (0)', benefice: 0 }, ...graphBeneficeData.jours]} margin={{ top: 8, right: 8, left: -12, bottom: 8 }}><CartesianGrid stroke="#e2e8f0" strokeDasharray="3 4" vertical={false}/><XAxis dataKey="date_label" tick={{ fontSize: 10, fill: '#64748b' }} tickMargin={8} minTickGap={18}/><YAxis tick={{ fontSize: 10, fill: '#64748b' }} width={56} tickFormatter={v => v >= 1000 ? `${Math.round(v/1000)}k` : v}/><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #d1fae5', boxShadow: '0 8px 24px rgba(15,23,42,.08)', fontSize: 12 }} formatter={(v, name) => [`${Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${name === 'kg_convertis' ? 'kg' : 'FCFA'}`, name === 'benefice' ? 'Bénéfice estimé' : name === 'argent' ? 'Ventes + ajouts' : name]}/><Line type="linear" dataKey="benefice" name="Bénéfice estimé" stroke="#059669" strokeWidth={3} activeDot={{ r: 5, strokeWidth: 0 }} dot={false}/></LineChart></ResponsiveContainer></div> : <p className="py-8 text-center text-sm text-slate-400">Aucune vente encaissée ou aucun ajout en caisse sur cette période.</p>}
              <p className="mt-2 text-xs leading-relaxed text-slate-500">Calcul : (argent réellement reçu des ventes + ajouts approuvés en caisse) ÷ 2 500 = kg convertis, puis kg convertis × bénéfice/kg validé. Les retraits ne sont pas inclus.</p>
            </div>
          </div>
        </div>
      </section>



 {/* ═══ VALEURS DE DÉPART DE LA PÉRIODE ═══ */}
      {periodeActive && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">🏁 Valeurs de départ de la période</h2>
            <select value={periodeSelectionnee?.id || ''} onChange={e => selectionnerPeriode(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600">
              {periodes.map(p => <option key={p.id} value={p.id}>{formatSafeDate(p.date_debut, 'dd/MM/yyyy')} → {p.date_fin ? formatSafeDate(p.date_fin, 'dd/MM/yyyy') : 'en cours'}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-slate-700">{parseFloat(periodeSelectionnee?.stock_depart_kg||0).toFixed(1)} kg</p>
              <p className="text-xs text-slate-400 mt-0.5">Stock de départ</p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-slate-700">{parseInt(periodeSelectionnee?.caisse_depart||0).toLocaleString('fr')} F</p>
              <p className="text-xs text-slate-400 mt-0.5">Caisse de départ</p>
            </div>
          </div>
        </div>
      )}


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
