const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');
const folderController = require('../controllers/folderController');
const accessAccountController = require('../controllers/accessAccountController');
const googlePhotosController = require('../controllers/googlePhotosController');
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

// Access account management routes (admin only)
router.get('/access-accounts', requireAuth, accessAccountController.getAllAccounts.bind(accessAccountController));
router.post('/access-accounts', requireAuth, accessAccountController.createAccount.bind(accessAccountController));
router.put('/access-accounts/:id', requireAuth, accessAccountController.updateAccount.bind(accessAccountController));
router.delete('/access-accounts/:id', requireAuth, accessAccountController.deleteAccount.bind(accessAccountController));

// PIN authentication routes (public)
router.post('/auth/pin', accessAccountController.authenticateWithPin.bind(accessAccountController));
router.get('/auth/session', accessAccountController.getSession.bind(accessAccountController));
router.delete('/auth/session', accessAccountController.clearSession.bind(accessAccountController));

// Google Photos routes (admin only)
router.get('/admin/google-photos/status', requireAuth, googlePhotosController.getAuthStatus);
router.post('/admin/google-photos/auth', requireAuth, googlePhotosController.initiateAuth);
router.get('/admin/google-photos/callback', googlePhotosController.handleCallback);
router.delete('/admin/google-photos/auth', requireAuth, googlePhotosController.revokeAccess);
router.post('/admin/google-photos/session', requireAuth, googlePhotosController.createPickerSession);

// Authentication routes
const authRoutes = require('./auth');
router.use('/auth', authRoutes);

module.exports = router;