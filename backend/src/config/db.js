const { Pool } = require('pg');

// Nettoyer l'URL : supprimer channel_binding qui n'est pas supporté par node-postgres
let connectionString = process.env.DATABASE_URL || '';
connectionString = connectionString.replace('&channel_binding=require', '');
connectionString = connectionString.replace('?channel_binding=require&', '?');
connectionString = connectionString.replace('?channel_binding=require', '');

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => console.log('✅ PostgreSQL connecté'));
pool.on('error', (err) => console.error('❌ Erreur PostgreSQL:', err.message));

const query = (text, params) => pool.query(text, params);
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
