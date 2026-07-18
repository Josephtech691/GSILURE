import { useNotifs } from '../../contexts/NotifContext';

export default function OfflineBanner() {
  const { isOnline, syncMsg } = useNotifs();

  if (isOnline && !syncMsg) return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 px-4 py-2.5 text-center text-sm font-medium transition-all ${
      syncMsg ? 'bg-water-600 text-white' : 'bg-amber-500 text-white'
    }`}>
      {syncMsg || '📶 Hors connexion — Les données sont sauvegardées localement et seront synchronisées à la reconnexion.'}
    </div>
  );
}
