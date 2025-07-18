const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');
const folderController = require('../controllers/folderController');
const upload = require('../middleware/upload');
const { requireAuth } = require('../middleware/auth');

// Public routes (no authentication required)
router.get('/random-image', imageController.getRandomImage.bind(imageController));

// Protected routes (authentication required)
router.post('/upload', requireAuth, upload.array('images'), imageController.uploadImages.bind(imageController));
router.delete('/images', requireAuth, imageController.deleteImage.bind(imageController));

// Folder routes (protected)
router.get('/folders', requireAuth, folderController.getFolderContents.bind(folderController));
router.post('/folders', requireAuth, folderController.createFolder.bind(folderController));
router.delete('/folders', requireAuth, folderController.deleteFolder.bind(folderController));

// Authentication routes
const authRoutes = require('./auth');
router.use('/auth', authRoutes);

module.exports = router;