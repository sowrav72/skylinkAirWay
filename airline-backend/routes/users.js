const express = require('express')
const { getAllUsers, createUser, updateUser, deleteUser, assignStaffToFlight, getAuditLogs } = require('../controllers/userController')
const { verifyToken, requireRole } = require('../middleware/auth')
const { validate } = require('../middleware/validate')
const router = express.Router()

router.get('/',              verifyToken, requireRole('admin'), getAllUsers)
router.post('/',             verifyToken, requireRole('admin'), validate('createUser'), createUser)
router.patch('/:id',         verifyToken, requireRole('admin'), updateUser)
router.delete('/:id',        verifyToken, requireRole('admin'), deleteUser)
router.post('/assign-staff', verifyToken, requireRole('admin'), assignStaffToFlight)
router.get('/audit-logs',    verifyToken, requireRole('admin'), getAuditLogs)

module.exports = router
