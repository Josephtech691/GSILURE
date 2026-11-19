import { Component } from 'react';
import { reportError } from '../lib/errorReporter';

export default class ErrorBoundary extends Component {
  state = { erreur: null };

  static getDerivedStateFromError(erreur) { return { erreur }; }

  componentDidCatch(erreur, info) {
    reportError({
      message: erreur?.message || 'Erreur d’affichage',
      stack: erreur?.stack,
      contexte: { type: 'react', composants: String(info?.componentStack || '').slice(0, 1500) },
    });
  }

  render() {
    if (!this.state.erreur) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="card max-w-sm w-full p-6 text-center space-y-3">
          <p className="text-3xl">😕</p>
          <h1 className="text-lg font-bold text-slate-800">Un problème est survenu</h1>
          <p className="text-sm text-slate-500">L’erreur a été signalée automatiquement au développeur.</p>
          <button className="btn-primary w-full justify-center" onClick={() => window.location.assign('/')}>Revenir à l’accueil</button>
        </div>
      </div>
    );
  }
}
