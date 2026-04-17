const express = require('express')
const { createBooking, getUserBookings, cancelBooking } = require('../controllers/bookingController')
const { verifyToken, requireRole } = require('../middleware/auth')
const { validate } = require('../middleware/validate')
const router = express.Router()

router.post('/',      verifyToken, requireRole('passenger'), validate('createBooking'), createBooking)
router.get('/user',   verifyToken, getUserBookings)
router.delete('/:id', verifyToken, cancelBooking)

module.exports = router
