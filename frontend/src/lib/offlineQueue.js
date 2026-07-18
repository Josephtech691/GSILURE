/**
 * File d'attente offline — IndexedDB
 * Stocke les mutations qui échouent hors connexion et les rejoue à la reconnexion
 */

const DB_NAME = 'poissonnerie_offline';
const STORE_NAME = 'queue';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Ajouter une requête à la queue */
export async function enqueue(item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).add({
      ...item,
      timestamp: Date.now(),
      retries: 0,
    });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Récupérer toutes les entrées en attente */
export async function getAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Supprimer une entrée après succès */
export async function remove(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** Rejouer la queue au retour de connexion */
export async function replayQueue(apiInstance) {
  const items = await getAll();
  if (!items.length) return { synced: 0, errors: 0 };

  let synced = 0, errors = 0;
  for (const item of items) {
    try {
      await apiInstance({ method: item.method, url: item.url, data: item.data });
      await remove(item.id);
      synced++;
    } catch (err) {
      if (err.response) {
        // Erreur serveur permanente → supprimer quand même
        await remove(item.id);
        errors++;
      }
      // Sinon encore hors ligne → garder dans la queue
    }
  }
  return { synced, errors };
}
