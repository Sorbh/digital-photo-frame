const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');
const folderController = require('../controllers/folderController');
const upload = require('../middleware/upload');

// Image routes
router.get('/random-image', imageController.getRandomImage.bind(imageController));
router.post('/upload', upload.array('images'), imageController.uploadImages.bind(imageController));
router.delete('/images', imageController.deleteImage.bind(imageController));

// Folder routes
router.get('/folders', folderController.getFolderContents.bind(folderController));
router.post('/folders', folderController.createFolder.bind(folderController));
router.delete('/folders', folderController.deleteFolder.bind(folderController));

module.exports = router;