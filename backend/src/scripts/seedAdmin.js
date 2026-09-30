require('dotenv').config();
const { pool } = require('../config/db');
const User = require('../db/userModel');

(async () => {
  try {
    const email = (process.env.ADMIN_EMAIL || 'admin@helper4u.com').toLowerCase();
    if (await User.findByEmailWithPassword(email)) {
      console.log(`Admin already exists: ${email}`);
    } else {
      await User.create({
        name: process.env.ADMIN_NAME || 'Platform Admin',
        email,
        password: process.env.ADMIN_PASSWORD || 'Admin@12345',
        role: 'admin',
      });
      console.log(`Admin created: ${email}`);
    }
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
