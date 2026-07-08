/**
 * create-admin.js
 * Run this ONCE after setting up MySQL to create a working super_admin account.
 * Usage: node create-admin.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  const pool = await mysql.createPool({
    host:     process.env.DB_HOST     || '127.0.0.1',
    port:     process.env.DB_PORT     || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'ecommerce_supermarket',
  });

  // ── Change these if you want different credentials ──
  const ADMIN_NAME     = 'Super Admin';
  const ADMIN_EMAIL    = 'admin@example.com';
  const ADMIN_PASSWORD = 'admin123';
  const ADMIN_ROLE     = 'super_admin';
  // ────────────────────────────────────────────────────

  console.log('🔑 Hashing password...');
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  // Delete old broken entry if exists
  await pool.query('DELETE FROM users WHERE email = ?', [ADMIN_EMAIL]);

  // Insert fresh admin
  await pool.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [ADMIN_NAME, ADMIN_EMAIL, hash, ADMIN_ROLE]
  );

  console.log('✅ Admin account created successfully!');
  console.log(`   📧 Email   : ${ADMIN_EMAIL}`);
  console.log(`   🔐 Password: ${ADMIN_PASSWORD}`);
  console.log(`   👑 Role    : ${ADMIN_ROLE}`);
  console.log('\nYou can now log in at: http://localhost:5173/admin/login');

  await pool.end();
}

createAdmin().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
