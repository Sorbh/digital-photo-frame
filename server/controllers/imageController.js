const path = require('path');
const fs = require('fs-extra');
const sharp = require('sharp');

class ImageController {
  constructor() {
    this.uploadsDir = path.join(__dirname, '..', 'uploads');
  }

  // Get all images recursively
  async getAllImages(dir = this.uploadsDir) {
    const images = [];
    const items = await fs.readdir(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        const subImages = await this.getAllImages(fullPath);
        images.push(...subImages);
      } else if (item.isFile() && /\.(jpg|jpeg|png|gif|webp)$/i.test(item.name)) {
        images.push({
          path: fullPath,
          relativePath: path.relative(this.uploadsDir, fullPath),
          folder: path.basename(path.dirname(fullPath))
        });
      }
    }
    
    return images;
  }

  // Get random image endpoint
  async getRandomImage(req, res) {
    try {
      const images = await this.getAllImages();
      
      if (images.length === 0) {
        return res.status(404).json({ message: 'No images found' });
      }
      
      const randomImage = images[Math.floor(Math.random() * images.length)];
      const relativePath = `/uploads/${randomImage.relativePath}`;
      const fullUrl = `${req.protocol}://${req.get('host')}${relativePath}`;
      
      res.json({
        path: relativePath,
        url: fullUrl,
        folder: randomImage.folder,
        filename: path.basename(randomImage.path)
      });
    } catch (error) {
      console.error('Error getting random image:', error);
      res.status(500).json({ message: 'Server error' });
    }
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
      res.json({ message: 'Image deleted successfully' });
    } catch (error) {
      console.error('Error deleting image:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
}

module.exports = new ImageController();