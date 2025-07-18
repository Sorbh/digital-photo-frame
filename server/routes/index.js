const express = require('express');
const router = express.Router();

// Import route modules
const apiRoutes = require('./api');
const viewRoutes = require('./views');

// Mount routes
router.use('/api', apiRoutes);
router.use('/', viewRoutes);

module.exports = router;