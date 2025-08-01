const path = require('path');
const fs = require('fs-extra');
const sharp = require('sharp');

class ImageController {
  constructor() {
    this.uploadsDir = path.join(__dirname, '..', 'uploads');
    // Track recently shown images to prevent repeats
    this.recentlyShown = new Set();
    this.maxRecentCount = parseInt(process.env.MAX_RECENT_IMAGES) || 10; // Number of recent images to avoid
    this.imageCache = null;
    this.cacheTimestamp = null;
    this.cacheExpiry = parseInt(process.env.IMAGE_CACHE_EXPIRY) || 60000; // Cache for 1 minute
  }

  // Get all images recursively with caching
  async getAllImages(dir = this.uploadsDir, useCache = true) {
    // Check if cache is valid
    if (useCache && this.imageCache && this.cacheTimestamp && 
        (Date.now() - this.cacheTimestamp) < this.cacheExpiry) {
      return this.imageCache;
    }

    const images = [];
    const items = await fs.readdir(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        const subImages = await this.getAllImages(fullPath, false); // Don't use cache for recursion
        images.push(...subImages);
      } else if (item.isFile() && /\.(jpg|jpeg|png|gif|webp)$/i.test(item.name)) {
        const imageData = {
          path: fullPath,
          relativePath: path.relative(this.uploadsDir, fullPath),
          folder: path.basename(path.dirname(fullPath)),
          id: path.relative(this.uploadsDir, fullPath) // Use relative path as unique ID
        };
        images.push(imageData);
      }
    }
    
    // Update cache only for root call
    if (useCache) {
      this.imageCache = images;
      this.cacheTimestamp = Date.now();
    }
    
    return images;
  }

  // Get random image endpoint with anti-repeat logic and folder filtering
  async getRandomImage(req, res) {
    try {
      const folderFilter = req.query.folder;
      const allImages = await this.getAllImages();
      
      if (allImages.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'No images found',
          code: 'NO_IMAGES_FOUND'
        });
      }
      
      let availableImages = allImages;
      
      // Apply folder filter if specified
      if (folderFilter) {
        const decodedFolder = decodeURIComponent(folderFilter);
        console.log('🔍 API Filter - Requested folder:', decodedFolder);
        console.log('📁 API Filter - Total images before filter:', allImages.length);
        
        availableImages = allImages.filter(img => {
          const imgFolder = path.dirname(img.relativePath);
          const match = imgFolder === decodedFolder || imgFolder.startsWith(decodedFolder + path.sep);
          if (match) {
            console.log('✅ API Filter - Match found:', img.relativePath, 'in folder:', imgFolder);
          }
          return match;
        });
        
        console.log('📁 API Filter - Images after filter:', availableImages.length);
        
        if (availableImages.length === 0) {
          console.log('❌ API Filter - No images found in folder:', decodedFolder);
          return res.status(404).json({ 
            success: false,
            error: `No images found in folder: ${decodedFolder}`,
            code: 'FOLDER_EMPTY'
          });
        }
      }
      
      // If we have enough images, filter out recently shown ones
      if (availableImages.length > this.maxRecentCount) {
        const filteredByRecent = availableImages.filter(img => !this.recentlyShown.has(img.id));
        
        // If all images have been shown recently, reset the recently shown list
        if (filteredByRecent.length === 0) {
          console.log('All images in folder shown recently, resetting recent list');
          this.recentlyShown.clear();
          // Keep availableImages as is (with folder filter applied)
        } else {
          availableImages = filteredByRecent;
        }
      }
      
      // Select random image from available pool
      const randomIndex = Math.floor(Math.random() * availableImages.length);
      const randomImage = availableImages[randomIndex];
      
      console.log('🎲 API Filter - Selected image:', randomImage.relativePath, 'from folder:', path.dirname(randomImage.relativePath));
      
      // Add to recently shown list
      this.recentlyShown.add(randomImage.id);
      
      // Limit the size of recently shown set
      if (this.recentlyShown.size > this.maxRecentCount) {
        // Convert to array, remove oldest entries, convert back to Set
        const recentArray = Array.from(this.recentlyShown);
        this.recentlyShown = new Set(recentArray.slice(-this.maxRecentCount));
      }
      
      const relativePath = `/uploads/${randomImage.relativePath}`;
      const fullUrl = `${req.protocol}://${req.get('host')}${relativePath}`;
      
      console.log(`Selected image: ${randomImage.id}, Recently shown count: ${this.recentlyShown.size}/${availableImages.length}, Folder filter: ${folderFilter || 'none'}`);
      
      res.json({
        success: true,
        image: {
          id: randomImage.id,
          filename: path.basename(randomImage.path),
          path: relativePath,
          folder: path.dirname(randomImage.relativePath),
          url: fullUrl,
          thumbnail: `${req.protocol}://${req.get('host')}/api/images/${encodeURIComponent(randomImage.id)}/thumbnail`,
          metadata: {
            size: null, // Would need fs.stat to get actual size
            dimensions: {
              width: null,
              height: null
            },
            createdAt: null
          }
        }
      });
    } catch (error) {
      console.error('Error getting random image:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Get image thumbnail
  async getImageThumbnail(req, res) {
    try {
      const imageId = decodeURIComponent(req.params.imageId);
      const imagePath = path.join(this.uploadsDir, imageId);
      
      if (!await fs.pathExists(imagePath)) {
        return res.status(404).json({
          success: false,
          error: 'Image not found',
          code: 'IMAGE_NOT_FOUND'
        });
      }
      
      // Generate thumbnail
      const thumbnailBuffer = await sharp(imagePath)
        .resize(200, 200, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toBuffer();
      
      res.set({
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600'
      });
      res.send(thumbnailBuffer);
    } catch (error) {
      console.error('Error generating image thumbnail:', error);
      res.status(500).json({
        success: false,
        error: 'Server error',
        code: 'SERVER_ERROR'
      });
    }
  }

  // Clear image cache to force refresh
  clearImageCache() {
    this.imageCache = null;
    this.cacheTimestamp = null;
    console.log('Image cache cleared');
  }

  // Upload images
  async uploadImages(req, res) {
    try {
      console.log('Upload request body:', req.body);
      console.log('Upload files:', req.files?.map(f => f.path));
      
      const uploadedFiles = req.files;
      const targetPath = req.body.path || 'uploads';
      const processedFiles = [];
      
      for (const file of uploadedFiles) {
        // If the target path is different from where multer uploaded it, move the file
        const targetDir = path.join(__dirname, '..', targetPath);
        const targetFilePath = path.join(targetDir, file.filename);
        
        // Ensure target directory exists
        await fs.ensureDir(targetDir);
        
        // Process image with Sharp for optimization
        const processedPath = path.join(path.dirname(file.path), `processed_${file.filename}`);
        
        await sharp(file.path)
          .rotate() // Auto-rotate based on EXIF orientation
          .resize(
            parseInt(process.env.MAX_RESOLUTION_WIDTH) || 1920, 
            parseInt(process.env.MAX_RESOLUTION_HEIGHT) || 1080, 
            { fit: 'inside', withoutEnlargement: true }
          )
          .jpeg({ quality: parseInt(process.env.IMAGE_QUALITY) || 85 })
          .toFile(processedPath);
        
        // Remove original and move processed to target location
        await fs.remove(file.path);
        await fs.move(processedPath, targetFilePath);
        
        processedFiles.push({
          filename: file.filename,
          originalname: file.originalname,
          path: targetFilePath,
          size: file.size
        });
      }
      
      // Clear cache after upload to include new images
      this.clearImageCache();
      
      res.json({
        message: 'Images uploaded successfully',
        files: processedFiles
      });
    } catch (error) {
      console.error('Error uploading images:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Delete image
  async deleteImage(req, res) {
    try {
      const imagePath = req.query.path;
      const fullPath = path.join(__dirname, '..', imagePath);
      
      if (!await fs.pathExists(fullPath)) {
        return res.status(404).json({ message: 'Image not found' });
      }
      
      await fs.remove(fullPath);
      
      // Clear cache after deletion to update available images
      this.clearImageCache();
      
      res.json({ message: 'Image deleted successfully' });
    } catch (error) {
      console.error('Error deleting image:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Rotate image
  async rotateImage(req, res) {
    try {
      const { path: imagePath, angle = 90 } = req.body;
      const fullPath = path.join(__dirname, '..', imagePath);
      
      if (!await fs.pathExists(fullPath)) {
        return res.status(404).json({ message: 'Image not found' });
      }
      
      // Validate angle (should be multiple of 90)
      if (angle % 90 !== 0) {
        return res.status(400).json({ message: 'Angle must be a multiple of 90 degrees' });
      }
      
      // Create a temporary file for the rotated image
      const tempPath = path.join(path.dirname(fullPath), `rotated_temp_${Date.now()}_${path.basename(fullPath)}`);
      
      // Rotate image by specified angle
      await sharp(fullPath)
        .rotate(angle)
        .jpeg({ quality: parseInt(process.env.IMAGE_QUALITY) || 85 })
        .toFile(tempPath);
      
      // Replace original with rotated image
      await fs.remove(fullPath);
      await fs.move(tempPath, fullPath);
      
      // Clear cache after rotation to update available images
      this.clearImageCache();
      
      const direction = angle > 0 ? 'clockwise' : 'counter-clockwise';
      res.json({ message: `Image rotated ${Math.abs(angle)}° ${direction} successfully` });
    } catch (error) {
      console.error('Error rotating image:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
}

module.exports = new ImageController();