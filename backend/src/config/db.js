const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Erreur inattendue sur le pool PostgreSQL:', err);
});

/**
 * Exécute une requête SQL et retourne les lignes.
 * @param {string} text  - Requête SQL avec placeholders $1, $2...
 * @param {Array}  params - Paramètres pour les placeholders
 */
const query = (text, params) => pool.query(text, params);

/**
 * Obtient un client du pool pour les transactions.
 */
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
