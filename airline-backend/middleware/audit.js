const prisma = require('./prismaClient')

/**
 * Log admin actions to audit_logs table.
 * Usage: await auditLog(req, 'DELETE_FLIGHT', 'flight', String(id), 'Deleted SW-0001')
 */
async function auditLog(req, action, resource, resourceId = null, details = null) {
  try {
    await prisma.auditLog.create({
      data: {
        userId:     req.user?.id ?? null,
        action,
        resource,
        resourceId: resourceId ? String(resourceId) : null,
        details,
        ip:         req.ip || req.socket?.remoteAddress || null,
      },
    })
  } catch (err) {
    // Audit failures must never crash the main request
    console.error('Audit log error:', err.message)
  }
}

module.exports = { auditLog }
