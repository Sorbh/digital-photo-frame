const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Authentication routes
router.post('/login', authController.handleLogin.bind(authController));
router.post('/logout', authController.handleLogout.bind(authController));
router.get('/status', authController.getStatus.bind(authController));

module.exports = router;