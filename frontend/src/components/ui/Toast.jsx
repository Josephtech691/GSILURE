import { useState, useEffect } from 'react';

export function useToast() {
  const [toast, setToast] = useState(null);
  const show = (texte, type = 'success', duree = 3000) => {
    setToast({ texte, type, id: Date.now() });
    setTimeout(() => setToast(null), duree);
  };
  return { toast, show };
}

export function ToastDisplay({ toast }) {
  if (!toast) return null;
  return (
    <div className={`fixed top-20 right-4 z-50 max-w-sm px-4 py-2.5 rounded-xl text-sm font-medium shadow-xl animate-in slide-in-from-right ${
      toast.type === 'success' ? 'bg-water-600 text-white' :
      toast.type === 'error' ? 'bg-red-600 text-white' :
      'bg-ocean-600 text-white'
    }`}>
      {toast.texte}
    </div>
  );
}
