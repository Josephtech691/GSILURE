const API = import.meta.env.VITE_API_URL?.replace('/api','') || '';

export default function Avatar({ user, size = 'md', className = '' }) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-14 h-14 text-xl', xl: 'w-20 h-20 text-2xl' };
  const initials = user ? `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase() : '?';
  const photoUrl = user?.photo_url ? `${API}${user.photo_url}` : null;

  return photoUrl ? (
    <img src={photoUrl} alt={initials} className={`${sizes[size]} rounded-full object-cover ring-2 ring-white ${className}`} />
  ) : (
    <div className={`${sizes[size]} rounded-full bg-ocean-600 text-white font-bold flex items-center justify-center ring-2 ring-white ${className}`}>
      {initials}
    </div>
  );
}
