import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';

const STYLE = {
  ok:    { puce: '🟢', cls: 'border-green-200 bg-green-50', txt: 'text-green-800' },
  info:  { puce: '🔵', cls: 'border-ocean-200 bg-ocean-50', txt: 'text-ocean-800' },
  warn:  { puce: '🟠', cls: 'border-amber-200 bg-amber-50', txt: 'text-amber-800' },
  error: { puce: '🔴', cls: 'border-red-200 bg-red-50', txt: 'text-red-800' },
};

export default function DevIntegrite() {
  const [data, setData] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [ouvert, setOuvert] = useState({});

  const lancer = useCallback(async () => {
    setChargement(true); setErreur('');
    try { setData((await api.get('/dev/integrite')).data); }
    catch (e) { setErreur(e.response?.data?.message || 'Impossible de lancer les contrôles.'); }
    finally { setChargement(false); }
  }, []);
  useEffect(() => { lancer(); }, [lancer]);

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Intégrité des données</h1>
          <p className="text-sm text-slate-500">Détecte les incohérences (stock, ventes, pertes, sécurité) avant qu’elles ne faussent les chiffres.</p>
        </div>
        <button className="btn-primary shrink-0" onClick={lancer} disabled={chargement}>{chargement ? '…' : '▶ Relancer'}</button>
      </div>

      {erreur && <div className="card p-4 text-sm text-red-700 bg-red-50">{erreur}</div>}

      {data && (
        <>
          <div className="grid grid-cols-4 gap-2 text-center">
            {['ok', 'info', 'warn', 'error'].map(k => (
              <div key={k} className={`rounded-xl border p-2 ${STYLE[k].cls}`}>
                <p className={`text-xl font-bold ${STYLE[k].txt}`}>{data.resume[k]}</p>
                <p className="text-[11px] text-slate-500">{{ ok: 'OK', info: 'Infos', warn: 'À surveiller', error: 'À corriger' }[k]}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400">Généré le {new Date(data.genere_le).toLocaleString('fr')}</p>

          <div className="space-y-2">
            {data.controles.map(c => {
              const st = STYLE[c.statut] || STYLE.info;
              const estOuvert = !!ouvert[c.id];
              const aDetails = (c.details || []).length > 0 || c.conseil;
              return (
                <div key={c.id} className={`rounded-xl border ${st.cls}`}>
                  <button className="w-full text-left px-4 py-3" disabled={!aDetails} onClick={() => setOuvert({ ...ouvert, [c.id]: !estOuvert })}>
                    <div className="flex items-start gap-2">
                      <span>{st.puce}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${st.txt}`}>{c.titre}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{c.resume}</p>
                      </div>
                      {aDetails && <span className="text-slate-400 text-xs">{estOuvert ? '▲' : '▼'}</span>}
                    </div>
                  </button>
                  {estOuvert && (
                    <div className="px-4 pb-3 space-y-2">
                      {(c.details || []).length > 0 && (
                        <div className="bg-white/70 rounded-lg divide-y divide-slate-100 text-xs">
                          {c.details.map((d, i) => (
                            <div key={i} className="flex justify-between gap-3 px-3 py-2"><span className="text-slate-600 break-words">{d.libelle}</span><span className="font-medium text-slate-800 text-right break-words">{d.valeur}</span></div>
                          ))}
                        </div>
                      )}
                      {c.conseil && <p className="text-xs text-slate-600">💡 {c.conseil}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
      {chargement && !data && <div className="flex justify-center py-10"><div className="w-7 h-7 border-4 border-ocean-500 border-t-transparent rounded-full animate-spin" /></div>}
    </div>
  );
}
