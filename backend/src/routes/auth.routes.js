const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

const isDev = process.env.NODE_ENV !== 'production';
const loginMax = parseInt(process.env.LOGIN_RATE_LIMIT_MAX || (isDev ? '50' : '10'), 10);
const loginWindowMs = parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000), 10);

const loginLimiter = rateLimit({
  windowMs: loginWindowMs,
  max: loginMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please wait a few minutes and try again.' },
});

router.post('/login', loginLimiter, authController.login);
router.get('/me', authMiddleware, authController.me);
router.post('/logout', authMiddleware, authController.logout);
router.post('/change-password', authMiddleware, authController.changePassword);

module.exports = router;
