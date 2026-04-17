const bcrypt = require('bcryptjs')
const jwt    = require('jsonwebtoken')
const prisma = require('../middleware/prismaClient')
const { auditLog } = require('../middleware/audit')

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, iat: Math.floor(Date.now() / 1000) },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

const safeUser = u => ({ id: u.id, name: u.name, email: u.email, role: u.role })

// POST /api/auth/register  — passenger self-register only
async function register(req, res) {
  try {
    const { name, email, password } = req.body  // validated by Zod middleware

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(409).json({ error: 'Email already registered' })

    const hashed = await bcrypt.hash(password, 12)
    const user   = await prisma.user.create({
      data: { name, email, password: hashed, role: 'passenger' },
    })

    const token = signToken(user)
    await auditLog(req, 'REGISTER', 'user', user.id, `New passenger: ${email}`)

    res.status(201).json({ token, user: safeUser(user) })
  } catch (err) {
    console.error('register:', err)
    res.status(500).json({ error: 'Registration failed' })
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body

    const user = await prisma.user.findUnique({ where: { email } })
    // Intentionally vague error — don't reveal whether email exists
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const match = await bcrypt.compare(password, user.password)
    if (!match) {
      await auditLog(req, 'LOGIN_FAIL', 'user', user.id, `Failed login: ${email}`)
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = signToken(user)
    await auditLog(req, 'LOGIN', 'user', user.id, `Login: ${email}`)

    res.json({ token, user: safeUser(user) })
  } catch (err) {
    console.error('login:', err)
    res.status(500).json({ error: 'Login failed' })
  }
}

// POST /api/auth/change-password  — authenticated
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const match = await bcrypt.compare(currentPassword, user.password)
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' })

    const hashed = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } })
    await auditLog(req, 'CHANGE_PASSWORD', 'user', user.id)

    res.json({ message: 'Password changed successfully' })
  } catch (err) {
    console.error('changePassword:', err)
    res.status(500).json({ error: 'Password change failed' })
  }
}

// GET /api/auth/me  — return current user from token
async function getMe(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true, isActive: true },
    })
    if (!user || !user.isActive) return res.status(401).json({ error: 'Account inactive' })
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' })
  }
}

module.exports = { register, login, changePassword, getMe }
