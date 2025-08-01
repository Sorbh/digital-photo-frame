const path = require('path');
const fs = require('fs-extra');
const sharp = require('sharp');
const imageController = require('./imageController');

class FolderController {
  constructor() {
    this.uploadsDir = path.join(__dirname, '..', 'uploads');
    this.thumbnailCache = new Map();
    this.thumbnailCacheExpiry = 3600000; // 1 hour
  }

  // Generate folder thumbnail from first image
  async generateFolderThumbnail(folderPath) {
    try {
      const fullPath = path.isAbsolute(folderPath) ? folderPath : path.join(this.uploadsDir, folderPath);
      const relativePath = path.relative(this.uploadsDir, fullPath);
      
      // Check cache first
      const cacheKey = relativePath;
      const cached = this.thumbnailCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.thumbnailCacheExpiry) {
        return cached.thumbnail;
      }
      
      // Find first image in folder (including subfolders)
      const firstImage = await this.findFirstImage(fullPath);
      if (!firstImage) {
        return null;
      }
      
      // Generate thumbnail
      const thumbnailBuffer = await sharp(firstImage)
        .resize(200, 200, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toBuffer();
      
      const thumbnailBase64 = `data:image/jpeg;base64,${thumbnailBuffer.toString('base64')}`;
      
      // Cache the result
      this.thumbnailCache.set(cacheKey, {
        thumbnail: thumbnailBase64,
        timestamp: Date.now()
      });
      
      return thumbnailBase64;
    } catch (error) {
      console.error('Error generating folder thumbnail:', error);
      return null;
    }
  }
  
  // Find first image in folder recursively
  async findFirstImage(dir) {
    try {
      const items = await fs.readdir(dir, { withFileTypes: true });
      
      // First check for images in current directory
      for (const item of items) {
        if (item.isFile() && /\.(jpg|jpeg|png|gif|webp)$/i.test(item.name)) {
          return path.join(dir, item.name);
        }
      }
      
      // If no images found, check subdirectories
      for (const item of items) {
        if (item.isDirectory()) {
          const subImage = await this.findFirstImage(path.join(dir, item.name));
          if (subImage) {
            return subImage;
          }
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }
  
  // Count images in folder recursively
  async countImagesInFolder(dir) {
    try {
      let count = 0;
      const items = await fs.readdir(dir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          count += await this.countImagesInFolder(fullPath);
        } else if (item.isFile() && /\.(jpg|jpeg|png|gif|webp)$/i.test(item.name)) {
          count++;
        }
      }
      
      return count;
    } catch (error) {
      return 0;
    }
  }
  
  // Get folder structure for slideshow selection
  async getFolderStructure(req, res) {
    try {
      const folderPath = req.params.folderPath || '';
      const fullPath = folderPath ? path.join(this.uploadsDir, folderPath) : this.uploadsDir;
      
      if (!await fs.pathExists(fullPath)) {
        return res.status(404).json({ 
          success: false,
          error: `Folder not found: ${folderPath}`,
          code: 'FOLDER_NOT_FOUND'
        });
      }
      
      const items = await fs.readdir(fullPath, { withFileTypes: true });
      const folders = [];
      const images = [];
      
      // Process folders
      for (const item of items) {
        if (item.isDirectory()) {
          const itemPath = path.join(fullPath, item.name);
          const relativePath = folderPath ? path.join(folderPath, item.name) : item.name;
          
          // Check if folder has subfolders
          const subItems = await fs.readdir(itemPath, { withFileTypes: true });
          const hasSubfolders = subItems.some(subItem => subItem.isDirectory());
          
          // Count images in this folder
          const imageCount = await this.countImagesInFolder(itemPath);
          
          // Generate thumbnail
          const thumbnail = await this.generateFolderThumbnail(relativePath);
          
          folders.push({
            name: item.name,
            path: relativePath,
            thumbnail: thumbnail,
            imageCount: imageCount,
            hasSubfolders: hasSubfolders
          });
        } else if (item.isFile() && /\.(jpg|jpeg|png|gif|webp)$/i.test(item.name)) {
          const relativePath = folderPath ? path.join(folderPath, item.name) : item.name;
          images.push({
            id: relativePath,
            filename: item.name,
            thumbnail: `/api/images/${encodeURIComponent(relativePath)}/thumbnail`
          });
        }
      }
      
      // Generate breadcrumb
      const breadcrumb = [];
      if (folderPath) {
        breadcrumb.push({ name: 'Root', path: '' });
        const pathParts = folderPath.split(path.sep);
        let currentPath = '';
        for (const part of pathParts) {
          currentPath = currentPath ? path.join(currentPath, part) : part;
          breadcrumb.push({ name: part, path: currentPath });
        }
      }
      
      const response = {
        success: true
      };
      
      if (folderPath) {
        // Specific folder request
        const imageCount = await this.countImagesInFolder(fullPath);
        const thumbnail = await this.generateFolderThumbnail(folderPath);
        const parentPath = path.dirname(folderPath);
        
        response.folder = {
          name: path.basename(folderPath),
          path: folderPath,
          parentPath: parentPath === '.' ? '' : parentPath,
          thumbnail: thumbnail,
          imageCount: imageCount,
          breadcrumb: breadcrumb
        };
        response.subfolders = folders.sort((a, b) => a.name.localeCompare(b.name));
        response.images = images.sort((a, b) => a.filename.localeCompare(b.filename));
      } else {
        // Root folder request
        response.folders = folders.sort((a, b) => a.name.localeCompare(b.name));
      }
      
      res.json(response);
    } catch (error) {
      console.error('Error getting folder structure:', error);
      res.status(500).json({ 
        success: false,
        error: 'Server error',
        code: 'SERVER_ERROR'
      });
    }
  }
  
  // Get folder thumbnail endpoint
  async getFolderThumbnail(req, res) {
    try {
      const folderPath = req.params.folderPath;
      const thumbnail = await this.generateFolderThumbnail(folderPath);
      
      if (!thumbnail) {
        return res.status(404).json({
          success: false,
          error: 'No thumbnail available for folder',
          code: 'THUMBNAIL_NOT_FOUND'
        });
      }
      
      // Extract base64 data and send as image
      const base64Data = thumbnail.replace(/^data:image\/jpeg;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      res.set({
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600'
      });
      res.send(buffer);
    } catch (error) {
      console.error('Error serving folder thumbnail:', error);
      res.status(500).json({
        success: false,
        error: 'Server error',
        code: 'SERVER_ERROR'
      });
    }
  }
  
  // Get folder contents (existing method)
  async getFolderContents(req, res) {
    try {
      const folderPath = req.query.path || 'uploads';
      const fullPath = path.join(__dirname, '..', folderPath);
      
      if (!await fs.pathExists(fullPath)) {
        return res.status(404).json({ message: 'Folder not found' });
      }
      
      const items = await fs.readdir(fullPath, { withFileTypes: true });
      const folders = [];
      const files = [];
      
      for (const item of items) {
        if (item.isDirectory()) {
          folders.push({
            name: item.name,
            type: 'folder',
            path: path.join(folderPath, item.name)
          });
        } else if (item.isFile() && /\.(jpg|jpeg|png|gif|webp)$/i.test(item.name)) {
          files.push({
            name: item.name,
            type: 'image',
            path: path.join(folderPath, item.name),
            url: `/uploads/${path.relative(this.uploadsDir, path.join(fullPath, item.name))}`
          });
        }
      }
      
      res.json({
        currentPath: folderPath,
        folders: folders.sort((a, b) => a.name.localeCompare(b.name)),
        files: files.sort((a, b) => a.name.localeCompare(b.name))
      });
    } catch (error) {
      console.error('Error reading folder:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Create folder
  async createFolder(req, res) {
    try {
      const { name, path: parentPath } = req.body;
      const fullPath = path.join(__dirname, '..', parentPath || 'uploads', name);
      
      if (await fs.pathExists(fullPath)) {
        return res.status(400).json({ message: 'Folder already exists' });
      }
      
      await fs.ensureDir(fullPath);
      res.json({ message: 'Folder created successfully', path: fullPath });
    } catch (error) {
      console.error('Error creating folder:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Delete folder
  async deleteFolder(req, res) {
    try {
      const folderPath = req.query.path;
      const fullPath = path.join(__dirname, '..', folderPath);
      
      if (!await fs.pathExists(fullPath)) {
        return res.status(404).json({ message: 'Folder not found' });
      }
      
      await fs.remove(fullPath);
      
      // Clear image cache after folder deletion as it might contain images
      imageController.clearImageCache();
      
      res.json({ message: 'Folder deleted successfully' });
    } catch (error) {
      console.error('Error deleting folder:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
}

module.exports = new FolderController();