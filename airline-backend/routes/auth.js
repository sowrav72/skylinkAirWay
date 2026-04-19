const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const pool     = require('../db');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register/passenger
// Body: { email, password, first_name, last_name, phone?, passport_number?, date_of_birth? }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/register/passenger', async (req, res) => {
  const { email, password, first_name, last_name, phone, passport_number, date_of_birth } = req.body;

  // Validation
  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({
      error: 'Required fields: email, password, first_name, last_name'
    });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check duplicate email
    const dup = await client.query('SELECT id FROM auth_users WHERE email = $1', [email.toLowerCase()]);
    if (dup.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Email is already registered' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    // Insert into auth_users (authentication only)
    const authRes = await client.query(
      `INSERT INTO auth_users (email, password_hash, role)
       VALUES ($1, $2, 'passenger') RETURNING id`,
      [email.toLowerCase(), password_hash]
    );
    const userId = authRes.rows[0].id;

    // Insert into passengers (role-specific data)
    await client.query(
      `INSERT INTO passengers (user_id, first_name, last_name, phone, passport_number, date_of_birth)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, first_name, last_name, phone || null, passport_number || null, date_of_birth || null]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Passenger registered successfully' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Register Passenger]', err.message);
    res.status(500).json({ error: 'Registration failed' });
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register/staff
// Body: { email, password, first_name, last_name, phone?, position?, employee_id? }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/register/staff', async (req, res) => {
  const { email, password, first_name, last_name, phone, position, employee_id } = req.body;

  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({
      error: 'Required fields: email, password, first_name, last_name'
    });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const dup = await client.query('SELECT id FROM auth_users WHERE email = $1', [email.toLowerCase()]);
    if (dup.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Email is already registered' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    // Insert into auth_users (authentication only)
    const authRes = await client.query(
      `INSERT INTO auth_users (email, password_hash, role)
       VALUES ($1, $2, 'staff') RETURNING id`,
      [email.toLowerCase(), password_hash]
    );
    const userId = authRes.rows[0].id;

    // Insert into staff (role-specific data)
    await client.query(
      `INSERT INTO staff (user_id, first_name, last_name, phone, position, employee_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, first_name, last_name, phone || null, position || null, employee_id || null]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Staff registered successfully' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Register Staff]', err.message);
    if (err.code === '23505') return res.status(409).json({ error: 'Employee ID already exists' });
    res.status(500).json({ error: 'Registration failed' });
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// Body: { email, password }
// Returns: JWT token + user info
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Fetch from auth_users only
    const result = await pool.query(
      'SELECT id, email, password_hash, role FROM auth_users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Fetch role-specific ID from the appropriate role table
    let roleId = null;
    let roleData = {};

    if (user.role === 'passenger') {
      const p = await pool.query(
        'SELECT id, first_name, last_name FROM passengers WHERE user_id = $1', [user.id]
      );
      if (p.rows.length > 0) {
        roleId = p.rows[0].id;
        roleData = { first_name: p.rows[0].first_name, last_name: p.rows[0].last_name };
      }
    } else if (user.role === 'staff') {
      const s = await pool.query(
        'SELECT id, first_name, last_name, employee_id, position FROM staff WHERE user_id = $1', [user.id]
      );
      if (s.rows.length > 0) {
        roleId = s.rows[0].id;
        roleData = {
          first_name: s.rows[0].first_name,
          last_name: s.rows[0].last_name,
          employee_id: s.rows[0].employee_id,
          position: s.rows[0].position
        };
      }
    } else if (user.role === 'admin') {
      const a = await pool.query(
        'SELECT id, first_name, last_name FROM admins WHERE user_id = $1', [user.id]
      );
      if (a.rows.length > 0) {
        roleId = a.rows[0].id;
        roleData = { first_name: a.rows[0].first_name, last_name: a.rows[0].last_name };
      }
    }

    const token = jwt.sign(
      { userId: user.id, roleId, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        roleId,
        ...roleData
      }
    });

  } catch (err) {
    console.error('[Login]', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;