const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');
const folderController = require('../controllers/folderController');
const upload = require('../middleware/upload');
const { requireAuth } = require('../middleware/auth');

// Public routes (no authentication required)
router.get('/random-image', imageController.getRandomImage.bind(imageController));
router.get('/images/random', imageController.getRandomImage.bind(imageController)); // New endpoint for consistency
router.get('/images/:imageId/thumbnail', imageController.getImageThumbnail.bind(imageController));

// Public folder routes for slideshow
router.get('/folders', folderController.getFolderStructure.bind(folderController));
router.get('/folders/:folderPath(*)', folderController.getFolderStructure.bind(folderController));
router.get('/folders/:folderPath(*)/thumbnail', folderController.getFolderThumbnail.bind(folderController));

// Protected routes (authentication required)
router.post('/upload', requireAuth, upload.array('images'), imageController.uploadImages.bind(imageController));
router.delete('/images', requireAuth, imageController.deleteImage.bind(imageController));
router.post('/images/rotate', requireAuth, imageController.rotateImage.bind(imageController));

// Folder management routes (protected)
router.get('/admin/folders', requireAuth, folderController.getFolderContents.bind(folderController));
router.post('/admin/folders', requireAuth, folderController.createFolder.bind(folderController));
router.delete('/admin/folders', requireAuth, folderController.deleteFolder.bind(folderController));

// Authentication routes
const authRoutes = require('./auth');
router.use('/auth', authRoutes);

module.exports = router;