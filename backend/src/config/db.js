const { Pool, types } = require('pg');

types.setTypeParser(1700, (v) => parseFloat(v));
types.setTypeParser(1082, (v) => v);
types.setTypeParser(20, (v) => parseInt(v, 10));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const query = (text, params) => pool.query(text, params);

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
