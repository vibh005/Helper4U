require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

(async () => {
  try {
    const sql = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8');
    await pool.query(sql);
    console.log('Database tables are ready.');
  } catch (err) {
    console.error('DB init failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
