const express = require('express')
const {
  getFlights, getFlightById, createFlight, updateFlight,
  deleteFlight, getFlightPassengers, getAssignedFlights,
} = require('../controllers/flightController')
const { verifyToken, requireRole } = require('../middleware/auth')
const { validate } = require('../middleware/validate')
const router = express.Router()

router.get('/',              getFlights)
router.get('/staff/assigned', verifyToken, requireRole('staff','admin'), getAssignedFlights)
router.get('/:id',           getFlightById)
router.get('/:id/passengers', verifyToken, requireRole('admin','staff'), getFlightPassengers)
router.post('/',             verifyToken, requireRole('admin'), validate('createFlight'), createFlight)
router.put('/:id',           verifyToken, requireRole('admin','staff'), validate('updateFlight'), updateFlight)
router.delete('/:id',        verifyToken, requireRole('admin'), deleteFlight)

module.exports = router
