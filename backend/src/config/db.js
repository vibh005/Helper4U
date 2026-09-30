const { Pool, types } = require('pg');

types.setTypeParser(1700, (v) => parseFloat(v)); // NUMERIC -> number
types.setTypeParser(1082, (v) => v);              // DATE -> 'YYYY-MM-DD' string (no timezone shifts)
types.setTypeParser(20, (v) => parseInt(v, 10));  // COUNT(*) (bigint) -> number

// Works with a local Postgres or a hosted one (Neon, Supabase, Render...).
// Hosted databases need SSL: add DB_SSL=true in .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const query = (text, params) => pool.query(text, params);

// Runs fn(client) inside a transaction: commits on success, rolls back on any error
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function connectDB() {
  try {
    await pool.query('SELECT 1');
    console.log('PostgreSQL connected');
  } catch (err) {
    console.error('PostgreSQL connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = { pool, query, withTransaction, connectDB };
