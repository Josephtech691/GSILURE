/**
 * Signale au serveur les erreurs détectées dans le navigateur (journal du compte développeur).
 * N'utilise volontairement PAS l'instance axios de l'app, pour ne jamais créer de boucle d'erreurs.
 */
const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://back-gsilure.vercel.app/api' : '/api');

const dejaVus = new Map();
let envoyes = 0;
const MAX_PAR_SESSION = 25;

export function reportError({ source = 'frontend', niveau = 'error', message, stack, route, methode, statut, contexte }) {
  try {
    if (!message || envoyes >= MAX_PAR_SESSION) return;
    const cle = `${source}|${message}|${route || ''}`;
    const maintenant = Date.now();
    if (maintenant - (dejaVus.get(cle) || 0) < 60000) return;
    dejaVus.set(cle, maintenant);
    envoyes += 1;

    const token = localStorage.getItem('token');
    fetch(`${BASE_URL}/errors/report`, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        source, niveau, message: String(message).slice(0, 1500), stack: stack ? String(stack).slice(0, 6000) : undefined,
        route: route || window.location.pathname, methode, statut,
        contexte: { page: window.location.pathname, en_ligne: navigator.onLine, ecran: `${window.innerWidth}x${window.innerHeight}`, ...contexte },
      }),
    }).catch(() => {});
  } catch { /* le signalement ne doit jamais casser l'app */ }
}

/** Erreurs JavaScript non gérées + promesses rejetées */
export function initErrorReporter() {
  window.addEventListener('error', (e) => {
    if (!e.message || e.message === 'Script error.') return;
    reportError({ message: e.message, stack: e.error?.stack, contexte: { fichier: e.filename, ligne: e.lineno, colonne: e.colno } });
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    // Les erreurs axios sont déjà traitées par l'intercepteur API
    if (r?.isAxiosError || r?.queued) return;
    reportError({ message: r?.message || String(r || 'Promesse rejetée'), stack: r?.stack, contexte: { type: 'unhandledrejection' } });
  });
}
