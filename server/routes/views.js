const express = require('express');
const router = express.Router();
const viewController = require('../controllers/viewController');

// View routes
router.get('/', viewController.redirectToSlideshow.bind(viewController));
router.get('/admin', viewController.serveAdmin.bind(viewController));
router.get('/slideshow', viewController.serveSlideshow.bind(viewController));

module.exports = router;