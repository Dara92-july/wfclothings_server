const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { registerValidator, loginValidator } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, registerValidator, authController.register);
router.post('/login', authLimiter, loginValidator, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', protect, authController.logout);
router.get('/profile', protect, authController.getProfile);
router.put('/profile', protect, authController.updateProfile);
router.post('/forgot-password', authController.forgotPassword);
router.put('/reset-password/:token', authController.resetPassword);

module.exports = router;
