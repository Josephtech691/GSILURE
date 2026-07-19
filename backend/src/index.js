require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('./config/db');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'https://poissonnerie.vercel.app',
];

app.use(cors({ origin: (origin, cb) => (!origin || allowedOrigins.includes(origin)) ? cb(null,true) : cb(new Error('CORS')), credentials: true }));
app.use(express.json());

// Servir les avatars uploadés
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// ROUTE DEBUG TEMPORAIRE — à supprimer après
app.get('/debug', async (req, res) => {
  try {
    const r = await db.query('SELECT id, email, role, actif FROM users');
    res.json({ users: r.rows, db_url: process.env.DATABASE_URL?.slice(0, 30) + '...' });
  } catch(e) {
    res.json({ error: e.message });
  }
});
// Routes
app.use('/api/auth',   require('./routes/auth'));
app.use('/api/ventes', require('./routes/ventes'));
app.use('/api/stocks', require('./routes/stocks'));
app.use('/api/chat',   require('./routes/chat'));

app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
app.use((req, res) => res.status(404).json({ message: 'Route non trouvée.' }));
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ message: err.message || 'Erreur serveur.' });
});

// Socket.io
const io = new Server(server, { cors: { origin: allowedOrigins, methods: ['GET','POST'], credentials: true } });

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Token manquant.'));
  try { socket.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { next(new Error('Token invalide.')); }
});

io.on('connection', (socket) => {
  console.log(`[WS] ${socket.user.prenom} connecté`);

  socket.on('rejoindre-salon', async ({ date }) => {
    socket.rooms.forEach(r => { if (r !== socket.id) socket.leave(r); });
    socket.join(`chat-${date}`);
    try {
      const msgs = await db.query(
        `SELECT mc.*, u.nom || ' ' || u.prenom AS auteur_nom, u.role AS auteur_role, u.photo_url AS auteur_photo
         FROM messages_chat mc JOIN users u ON mc.auteur_id = u.id
         WHERE mc.date_salon = $1 ORDER BY mc.created_at`, [date]
      );
      socket.emit('historique-messages', msgs.rows);
    } catch(e) { console.error(e); }
  });

  socket.on('nouveau-message', async ({ date, contenu }) => {
    if (!date || !contenu?.trim()) return;
    try {
      const ins = await db.query(
        `INSERT INTO messages_chat (date_salon, auteur_id, contenu) VALUES ($1,$2,$3) RETURNING *`,
        [date, socket.user.id, contenu.trim()]
      );
      const msg = await db.query(
        `SELECT mc.*, u.nom || ' ' || u.prenom AS auteur_nom, u.role AS auteur_role, u.photo_url AS auteur_photo
         FROM messages_chat mc JOIN users u ON mc.auteur_id = u.id WHERE mc.id = $1`,
        [ins.rows[0].id]
      );
      io.to(`chat-${date}`).emit('message-recu', msg.rows[0]);
    } catch(e) { socket.emit('erreur', { message: 'Envoi échoué.' }); }
  });

  socket.on('demande-soumise', (data) => {
    io.emit('notification-admin', { ...data, user: socket.user, created_at: new Date().toISOString() });
  });

  socket.on('demande-traitee', (data) => {
    io.emit('notification-employe', data);
  });

  socket.on('disconnect', () => console.log(`[WS] ${socket.user?.prenom} déconnecté`));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => console.log(`✅ Serveur port ${PORT} — ${process.env.NODE_ENV || 'dev'}`));
