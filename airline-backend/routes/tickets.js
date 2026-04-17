const express = require('express')
const { downloadTicket, downloadReceipt } = require('../controllers/ticketController')
const { verifyToken } = require('../middleware/auth')
const { downloadLimiter } = require('../middleware/rateLimiter')

const ticketRouter  = express.Router()
const receiptRouter = express.Router()

ticketRouter.get( '/:id/download', verifyToken, downloadLimiter, downloadTicket)
receiptRouter.get('/:id/download', verifyToken, downloadLimiter, downloadReceipt)

module.exports = { ticketRouter, receiptRouter }
