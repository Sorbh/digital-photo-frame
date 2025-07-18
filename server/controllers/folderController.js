const path = require('path');
const fs = require('fs-extra');
const imageController = require('./imageController');

class FolderController {
  constructor() {
    this.uploadsDir = path.join(__dirname, '..', 'uploads');
  }

  // Get folder contents
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