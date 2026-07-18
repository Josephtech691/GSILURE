import { useState, useRef } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import Avatar from '../../components/ui/Avatar';
import { useToast, ToastDisplay } from '../../components/ui/Toast';

export default function EmployeProfil() {
  const { user, updateUser } = useAuth();
  const { toast, show } = useToast();
  const fileRef = useRef(null);

  const [profilForm, setProfilForm] = useState({ nom: user?.nom || '', prenom: user?.prenom || '', telephone: user?.telephone || '' });
  const [mdpForm, setMdpForm] = useState({ ancien_mdp: '', nouveau_mdp: '', confirm_mdp: '' });
  const [profilLoading, setProfilLoading] = useState(false);
  const [mdpLoading, setMdpLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const sauvegarderProfil = async (e) => {
    e.preventDefault();
    setProfilLoading(true);
    try {
      const res = await api.patch('/auth/profil', profilForm);
      updateUser(res.data.user);
      show('Profil mis à jour ✓', 'success');
    } catch (err) { show(err.response?.data?.message || 'Erreur', 'error'); }
    finally { setProfilLoading(false); }
  };

  const changerMotDePasse = async (e) => {
    e.preventDefault();
    if (mdpForm.nouveau_mdp !== mdpForm.confirm_mdp)
      return show('Les mots de passe ne correspondent pas', 'error');
    setMdpLoading(true);
    try {
      await api.patch('/auth/mot-de-passe', { ancien_mdp: mdpForm.ancien_mdp, nouveau_mdp: mdpForm.nouveau_mdp });
      setMdpForm({ ancien_mdp: '', nouveau_mdp: '', confirm_mdp: '' });
      show('Mot de passe modifié ✓', 'success');
    } catch (err) { show(err.response?.data?.message || 'Erreur', 'error'); }
    finally { setMdpLoading(false); }
  };

  const changerAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await api.post('/auth/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateUser({ photo_url: res.data.photo_url });
      show('Photo de profil mise à jour ✓', 'success');
    } catch (err) { show(err.response?.data?.message || 'Erreur', 'error'); }
    finally { setAvatarLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto space-y-5">
      <ToastDisplay toast={toast} />

      <div>
        <h1 className="text-xl font-bold text-slate-800">Mon profil</h1>
        <p className="text-sm text-slate-500">Vos informations et paramètres de connexion</p>
      </div>

      {/* Avatar */}
      <div className="card p-5 flex flex-col items-center gap-4">
        <div className="relative">
          <Avatar user={user} size="xl" />
          {avatarLoading && (
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={changerAvatar} />
        <button onClick={() => fileRef.current?.click()} className="btn-secondary text-sm" disabled={avatarLoading}>
          📷 Changer la photo
        </button>
        <p className="text-xs text-slate-400 text-center">JPG, PNG, WebP — max 5 Mo<br/>Cette photo sera visible dans le chat</p>
      </div>

      {/* Infos profil */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Informations personnelles</h2>
        <form onSubmit={sauvegarderProfil} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Prénom</label>
              <input type="text" value={profilForm.prenom} onChange={e => setProfilForm({...profilForm, prenom: e.target.value})} className="input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Nom</label>
              <input type="text" value={profilForm.nom} onChange={e => setProfilForm({...profilForm, nom: e.target.value})} className="input" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
            <input type="email" value={user?.email} disabled className="input bg-slate-50 text-slate-400 cursor-not-allowed" />
            <p className="text-xs text-slate-400 mt-0.5">L'email ne peut pas être modifié</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Téléphone</label>
            <input type="tel" value={profilForm.telephone} onChange={e => setProfilForm({...profilForm, telephone: e.target.value})} className="input" placeholder="Ex: +225 07 00 00 00 00" />
          </div>
          <button type="submit" disabled={profilLoading} className="btn-primary w-full justify-center">
            {profilLoading ? 'Sauvegarde…' : 'Sauvegarder le profil'}
          </button>
        </form>
      </div>

      {/* Changer mot de passe */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">🔑 Changer le mot de passe</h2>
        <form onSubmit={changerMotDePasse} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Mot de passe actuel *</label>
            <input type="password" required value={mdpForm.ancien_mdp} onChange={e => setMdpForm({...mdpForm, ancien_mdp: e.target.value})} className="input" placeholder="Votre mot de passe actuel" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Nouveau mot de passe *</label>
            <input type="password" required minLength={8} value={mdpForm.nouveau_mdp} onChange={e => setMdpForm({...mdpForm, nouveau_mdp: e.target.value})} className="input" placeholder="8 caractères minimum" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Confirmer le nouveau mot de passe *</label>
            <input type="password" required value={mdpForm.confirm_mdp} onChange={e => setMdpForm({...mdpForm, confirm_mdp: e.target.value})} className="input" placeholder="Répéter le nouveau mot de passe" />
          </div>
          <button type="submit" disabled={mdpLoading} className="btn-primary w-full justify-center">
            {mdpLoading ? 'Modification…' : 'Changer le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}
