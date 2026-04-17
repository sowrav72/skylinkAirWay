const express = require('express')
const { register, login, changePassword, getMe } = require('../controllers/authController')
const { verifyToken } = require('../middleware/auth')
const { validate }    = require('../middleware/validate')
const { authLimiter } = require('../middleware/rateLimiter')
const router = express.Router()

router.post('/register', authLimiter, validate('register'), register)
router.post('/login',    authLimiter, validate('login'),    login)
router.get( '/me',       verifyToken, getMe)
router.post('/change-password', verifyToken, validate('changePassword'), changePassword)

module.exports = router
