# 🐟 Poissonnerie d'Eau Douce — V2

Application web complète (PWA) de gestion des ventes de silures et alevins.

---

## 🚀 Démarrage rapide (local)

### 1. Base de données — Neon
1. Créer un projet sur [neon.tech](https://neon.tech)
2. Dans le SQL Editor, exécuter **`sql/schema_v2.sql`**
3. Copier la **Connection String**

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env
# Remplir DATABASE_URL, JWT_SECRET, FRONTEND_URL
npm run dev          # → http://localhost:4000
```

**Générer un JWT_SECRET solide :**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Frontend
```bash
cd frontend
npm install
# VITE_API_URL vide en local (proxy Vite prend le relais)
npm run dev          # → http://localhost:5173
```

---

## 🌐 Déploiement production

### Backend → Render
| Variable | Valeur |
|----------|--------|
| `DATABASE_URL` | URL Neon (avec `?sslmode=require`) |
| `JWT_SECRET` | Chaîne aléatoire longue |
| `FRONTEND_URL` | `https://votre-app.vercel.app` |
| `NODE_ENV` | `production` |
| `PORT` | `4000` |

- Build : `npm install`
- Start : `npm start`

> ⚠️ Render gratuit : le serveur dort après 15 min d'inactivité. Premier chargement ≈ 30-50 sec.

### Frontend → Vercel
| Variable | Valeur |
|----------|--------|
| `VITE_API_URL` | `https://votre-backend.onrender.com/api` |

- Framework : **Vite**

---

## 🔐 Premiers pas en production

Le seed SQL crée un admin avec un hash d'exemple. **Méthode recommandée :**

```bash
# Dans le dossier backend
node -e "
const b = require('bcryptjs');
b.hash('VotreMotDePasseSecret', 10).then(h => {
  console.log('Hash à mettre dans la DB :');
  console.log(h);
});
"
```

Puis exécuter dans Neon :
```sql
UPDATE users SET password_hash = 'VOTRE_HASH_ICI'
WHERE email = 'admin@poissonnerie.com';
```

---

## 📋 Structure du projet

```
poissonnerie/
├── sql/
│   ├── schema_v2.sql          ← Schéma complet V2 (tables + seed)
│   └── migration_v2.sql       ← Migration depuis V1
├── backend/
│   ├── src/
│   │   ├── index.js            ← Express + Socket.io
│   │   ├── config/
│   │   │   ├── db.js           ← Pool PostgreSQL
│   │   │   └── upload.js       ← Multer (avatars)
│   │   ├── middleware/auth.js
│   │   ├── controllers/
│   │   │   ├── authController.js    ← Auth + profil + avatars
│   │   │   ├── ventesController.js  ← Ventes + demandes unifiées
│   │   │   ├── stockController.js   ← Stocks + bacs + prix
│   │   │   └── chatController.js
│   │   ├── routes/
│   │   └── uploads/avatars/    ← Photos de profil
│   └── package.json
└── frontend/
    ├── public/
    │   ├── manifest.json       ← PWA manifest
    │   └── sw.js               ← Service Worker offline
    └── src/
        ├── lib/
        │   ├── api.js          ← Axios + queue offline
        │   ├── socket.js       ← Socket.io client
        │   └── offlineQueue.js ← IndexedDB sync
        ├── contexts/
        │   ├── AuthContext.jsx
        │   └── NotifContext.jsx ← Notifs + statut réseau
        ├── components/
        │   ├── chat/Chat.jsx
        │   ├── layout/
        │   └── ui/
        │       ├── Avatar.jsx
        │       ├── Toast.jsx
        │       └── OfflineBanner.jsx
        └── pages/
            ├── LoginPage.jsx
            ├── admin/
            │   ├── AdminDashboard.jsx  ← Stats + encaissements
            │   ├── AdminStocks.jsx     ← 7 bacs + prix historisés
            │   ├── AdminEmployes.jsx   ← Modal détail + graphique
            │   ├── AdminDemandes.jsx   ← Toutes demandes unifiées
            │   └── AdminProfil.jsx     ← Photo + sécurité mdp
            └── employe/
                ├── EmployeJournee.jsx  ← Ventes + annulation reste
                ├── EmployeGraphique.jsx ← Mouvements + encaissements
                └── EmployeProfil.jsx   ← Photo + changement mdp
```

---

## ✨ Fonctionnalités V2

### 🔐 Authentification & Profils
- Changement de mot de passe sécurisé (bcrypt, nécessite l'ancien mdp)
- Upload photo de profil (redimensionné 200×200 WebP via sharp)
- Photo visible dans le chat pour tous
- Page profil pour admin et employé

### 📦 Stocks & Bacs
- **7 bacs** de stockage avec vue visuelle par bac
- Types de poissons (silure, tilapia, carpe…) + catégories de poids (alevins, 200g… 1kg+)
- **Prix historisés** : modifier le prix n'affecte pas les dépôts passés
- Vue résumé par type + par bac

### 💰 Gestion financière
- **Annulation de reste** : demande d'annulation avec motif → approuvée par l'admin
- **Mouvements de caisse** : argent en plus / en moins avec justification
- **Encaissements** : l'employé déclare un versement au patron → approuvé → déduit de la caisse
- **Donnée "Encaissé"** dans le tableau de bord admin (filtrable par mois)

### 📋 Demandes unifiées
Page unique regroupant **tous** les types de demandes :
- Modification de journée passée
- Annulation de reste client
- Mouvement de caisse (+ ou -)
- Versement au patron (encaissement)

### 📱 PWA (Progressive Web App)
- Installable sur mobile et desktop
- **Mode hors ligne** : les actions sont stockées en IndexedDB et synchronisées au retour de connexion
- Service Worker avec stratégie Network-First (API) / Cache-First (assets)
- Bannière de statut réseau

### 🕐 Correction bug journée
La vérification de verrouillage se fait maintenant sur la **date** (today vs passé), et non sur un champ verrouillé manuel. Un employé peut toujours ajouter des clients à la journée du jour.

---

## 🔌 API — Routes principales

| Méthode | Route | Rôle |
|---------|-------|------|
| `POST` | `/api/auth/login` | Tous |
| `GET` | `/api/auth/me` | Tous |
| `PATCH` | `/api/auth/profil` | Tous |
| `PATCH` | `/api/auth/mot-de-passe` | Tous |
| `POST` | `/api/auth/avatar` | Tous |
| `GET/POST` | `/api/stocks` | Admin |
| `GET` | `/api/stocks/bacs` | Tous |
| `GET` | `/api/stocks/prix` | Tous |
| `POST` | `/api/stocks/prix` | Admin |
| `GET` | `/api/ventes/journee` | Tous |
| `POST` | `/api/ventes/journee/:id/clients` | Employé |
| `PUT/DELETE` | `/api/ventes/clients/:id` | Tous |
| `POST` | `/api/ventes/clients/:id/annuler-reste` | Employé |
| `POST` | `/api/ventes/mouvements-caisse` | Employé |
| `POST` | `/api/ventes/encaissements` | Employé |
| `GET` | `/api/ventes/graphique` | Tous |
| `GET` | `/api/ventes/dashboard` | Admin |
| `GET` | `/api/ventes/demandes` | Admin |
| `PATCH` | `/api/ventes/demandes/:id` | Admin |
