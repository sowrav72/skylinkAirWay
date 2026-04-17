const express = require('express')
const { getNotifications, markAsRead, markAllRead, deleteReadNotifications } = require('../controllers/notificationController')
const { verifyToken } = require('../middleware/auth')
const router = express.Router()

router.get('/',              verifyToken, getNotifications)
router.put('/read-all',      verifyToken, markAllRead)
router.put('/:id/read',      verifyToken, markAsRead)
router.delete('/read',       verifyToken, deleteReadNotifications)

module.exports = router
