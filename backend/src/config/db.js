const { Pool, types } = require('pg');

types.setTypeParser(1700, (v) => parseFloat(v)); // NUMERIC -> number

// Works with a local Postgres or a hosted one (Neon, Supabase, Render...).
// Hosted databases need SSL: add DB_SSL=true in .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const query = (text, params) => pool.query(text, params);

async function connectDB() {
  try {
    await pool.query('SELECT 1');
    console.log('PostgreSQL connected');
  } catch (err) {
    console.error('PostgreSQL connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = { pool, query, connectDB };
