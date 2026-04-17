const bcrypt  = require('bcryptjs')
const prisma  = require('../middleware/prismaClient')
const { auditLog } = require('../middleware/audit')

// GET /api/users
async function getAllUsers(req, res) {
  try {
    const { role, page = 1, limit = 50 } = req.query
    const take = Math.min(100, parseInt(limit) || 50)
    const skip = (Math.max(1, parseInt(page)) - 1) * take
    const where = {}
    if (role && ['passenger','staff','admin'].includes(role)) where.role = role

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id:true, name:true, email:true, role:true, isActive:true, createdAt:true },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.user.count({ where }),
    ])

    res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / take) })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' })
  }
}

// POST /api/users — admin creates staff/admin
async function createUser(req, res) {
  try {
    const { name, email, password, role } = req.body

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(409).json({ error: 'Email already in use' })

    const hashed = await bcrypt.hash(password, 12)
    const user   = await prisma.user.create({
      data: { name, email, password: hashed, role },
      select: { id:true, name:true, email:true, role:true },
    })

    await auditLog(req, 'CREATE_USER', 'user', user.id, `Created ${role}: ${email}`)
    res.status(201).json(user)
  } catch (err) {
    console.error('createUser:', err)
    res.status(500).json({ error: 'Failed to create user' })
  }
}

// PATCH /api/users/:id — admin updates user name/role/active status
async function updateUser(req, res) {
  try {
    const id  = Number(req.params.id)
    const { name, role, isActive } = req.body

    // Prevent self-demotion
    if (id === req.user.id && role && role !== 'admin') {
      return res.status(400).json({ error: 'Cannot change your own admin role' })
    }
    if (id === req.user.id && isActive === false) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' })
    }

    const data = {}
    if (name     !== undefined) data.name     = name
    if (role     !== undefined) data.role     = role
    if (isActive !== undefined) data.isActive = isActive

    const user = await prisma.user.update({
      where:  { id },
      data,
      select: { id:true, name:true, email:true, role:true, isActive:true },
    })

    await auditLog(req, 'UPDATE_USER', 'user', id, JSON.stringify(data))
    res.json(user)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' })
    res.status(500).json({ error: 'Failed to update user' })
  }
}

// DELETE /api/users/:id
async function deleteUser(req, res) {
  try {
    const id = Number(req.params.id)
    if (id === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' })

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    await prisma.user.delete({ where: { id } })
    await auditLog(req, 'DELETE_USER', 'user', id, `Deleted: ${user.email}`)
    res.json({ message: 'User deleted' })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' })
    res.status(500).json({ error: 'Failed to delete user' })
  }
}

// POST /api/users/assign-staff
async function assignStaffToFlight(req, res) {
  try {
    const { staffId, flightId } = req.body
    if (!staffId || !flightId) {
      return res.status(400).json({ error: 'staffId and flightId required' })
    }

    const [staff, flight] = await Promise.all([
      prisma.user.findUnique({ where: { id: Number(staffId) } }),
      prisma.flight.findUnique({ where: { id: Number(flightId) } }),
    ])

    if (!staff || staff.role !== 'staff') return res.status(400).json({ error: 'User is not a staff member' })
    if (!flight) return res.status(404).json({ error: 'Flight not found' })

    const assignment = await prisma.staffFlight.upsert({
      where:  { staffId_flightId: { staffId: Number(staffId), flightId: Number(flightId) } },
      create: { staffId: Number(staffId), flightId: Number(flightId) },
      update: {},
    })

    await auditLog(req, 'ASSIGN_STAFF', 'staff_flight', assignment.id,
      `Staff ${staff.email} → ${flight.flightNumber}`)

    res.status(201).json(assignment)
  } catch (err) {
    console.error('assignStaff:', err)
    res.status(500).json({ error: 'Failed to assign staff' })
  }
}

// GET /api/users/audit-logs — admin only
async function getAuditLogs(req, res) {
  try {
    const { page = 1, limit = 50 } = req.query
    const take = Math.min(100, parseInt(limit) || 50)
    const skip = (Math.max(1, parseInt(page)) - 1) * take

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        include: { user: { select: { name:true, email:true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.auditLog.count(),
    ])

    res.json({ logs, total, page: parseInt(page), pages: Math.ceil(total / take) })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs' })
  }
}

module.exports = { getAllUsers, createUser, updateUser, deleteUser, assignStaffToFlight, getAuditLogs }
