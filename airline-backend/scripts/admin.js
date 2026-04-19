/**
 * create_admin.js — Run with: node scripts/create_admin.js
 * Creates an admin user in auth_users + admins tables atomically.
 *
 * Usage:
 *   ADMIN_EMAIL=newadmin@airline.com \
 *   ADMIN_PASSWORD=SecurePass123 \
 *   ADMIN_FIRST=Jane \
 *   ADMIN_LAST=Doe \
 *   node scripts/create_admin.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Pool }  = require('pg');
const bcrypt    = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createAdmin() {
  const email      = process.env.ADMIN_EMAIL;
  const password   = process.env.ADMIN_PASSWORD;
  const first_name = process.env.ADMIN_FIRST || 'Admin';
  const last_name  = process.env.ADMIN_LAST  || 'User';

  if (!email || !password) {
    console.error('❌  Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const dup = await client.query('SELECT id FROM auth_users WHERE email = $1', [email]);
    if (dup.rows.length > 0) {
      console.error(`❌  Email ${email} already exists`);
      await client.query('ROLLBACK');
      process.exit(1);
    }

    const password_hash = await bcrypt.hash(password, 12);

    const authRes = await client.query(
      `INSERT INTO auth_users (email, password_hash, role) VALUES ($1, $2, 'admin') RETURNING id`,
      [email, password_hash]
    );
    const userId = authRes.rows[0].id;

    await client.query(
      `INSERT INTO admins (user_id, first_name, last_name) VALUES ($1, $2, $3)`,
      [userId, first_name, last_name]
    );

    await client.query('COMMIT');
    console.log(`✅  Admin created: ${first_name} ${last_name} <${email}>`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌  Failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

createAdmin();