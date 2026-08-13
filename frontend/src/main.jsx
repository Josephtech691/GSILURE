import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { NotifProvider } from './contexts/NotifContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NotifProvider>
          <App />
        </NotifProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

/**
 * Enregistre le Service Worker et demande immédiatement une mise à jour.
 * Cela évite d'attendre longtemps entre deux déploiements Vercel.
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        updateViaCache: 'none',
      });

      // Vérifie immédiatement si Vercel possède une nouvelle version.
      await registration.update();

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;

        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            console.info('Nouvelle version détectée. Rechargement...');
          }
        });
      });

      console.info('Service Worker enregistré.');
    } catch (error) {
      console.error('Erreur Service Worker :', error);
    }
  });
}
