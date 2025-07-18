const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/admin', express.static(path.join(__dirname, 'public')));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = req.body.path || 'uploads';
    const fullPath = path.join(__dirname, uploadPath);
    console.log('Upload destination:', uploadPath, 'Full path:', fullPath);
    fs.ensureDirSync(fullPath);
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  }
});

// Routes

// Get all images recursively
const getAllImages = async (dir) => {
  const images = [];
  const items = await fs.readdir(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      const subImages = await getAllImages(fullPath);
      images.push(...subImages);
    } else if (item.isFile() && /\.(jpg|jpeg|png|gif|webp)$/i.test(item.name)) {
      images.push({
        path: fullPath,
        relativePath: path.relative(path.join(__dirname, 'uploads'), fullPath),
        folder: path.basename(path.dirname(fullPath))
      });
    }
  }
  
  return images;
};

// Random image endpoint for slideshow
app.get('/api/random-image', async (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, 'uploads');
    const images = await getAllImages(uploadsDir);
    
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
});

// Get folder contents
app.get('/api/folders', async (req, res) => {
  try {
    const folderPath = req.query.path || 'uploads';
    const fullPath = path.join(__dirname, folderPath);
    
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
          url: `/uploads/${path.relative(path.join(__dirname, 'uploads'), path.join(fullPath, item.name))}`
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
});

// Create folder
app.post('/api/folders', async (req, res) => {
  try {
    const { name, path: parentPath } = req.body;
    const fullPath = path.join(__dirname, parentPath || 'uploads', name);
    
    if (await fs.pathExists(fullPath)) {
      return res.status(400).json({ message: 'Folder already exists' });
    }
    
    await fs.ensureDir(fullPath);
    res.json({ message: 'Folder created successfully', path: fullPath });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete folder
app.delete('/api/folders', async (req, res) => {
  try {
    const folderPath = req.query.path;
    const fullPath = path.join(__dirname, folderPath);
    
    if (!await fs.pathExists(fullPath)) {
      return res.status(404).json({ message: 'Folder not found' });
    }
    
    await fs.remove(fullPath);
    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload images
app.post('/api/upload', upload.array('images'), async (req, res) => {
  try {
    console.log('Upload request body:', req.body);
    console.log('Upload files:', req.files?.map(f => f.path));
    
    const uploadedFiles = req.files;
    const targetPath = req.body.path || 'uploads';
    const processedFiles = [];
    
    for (const file of uploadedFiles) {
      // If the target path is different from where multer uploaded it, move the file
      const targetDir = path.join(__dirname, targetPath);
      const targetFilePath = path.join(targetDir, file.filename);
      
      // Ensure target directory exists
      await fs.ensureDir(targetDir);
      
      // Process image with Sharp for optimization
      const processedPath = path.join(path.dirname(file.path), `processed_${file.filename}`);
      
      await sharp(file.path)
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
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
});

// Delete image
app.delete('/api/images', async (req, res) => {
  try {
    const imagePath = req.query.path;
    const fullPath = path.join(__dirname, imagePath);
    
    if (!await fs.pathExists(fullPath)) {
      return res.status(404).json({ message: 'Image not found' });
    }
    
    await fs.remove(fullPath);
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Serve admin panel
app.get('/', (req, res) => {
  res.redirect('/slideshow');
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Serve slideshow page
app.get('/slideshow', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'slideshow.html'));
});

// Initialize uploads directory
const initializeUploads = async () => {
  const uploadsDir = path.join(__dirname, 'uploads');
  const defaultFolders = ['family', 'vacation', 'holidays', 'misc'];
  
  await fs.ensureDir(uploadsDir);
  
  for (const folder of defaultFolders) {
    await fs.ensureDir(path.join(uploadsDir, folder));
  }
};

// Start server
app.listen(PORT, async () => {
  await initializeUploads();
  console.log(`Digital Photo Frame Server running on port ${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
  console.log(`API endpoint: http://localhost:${PORT}/api/random-image`);
});