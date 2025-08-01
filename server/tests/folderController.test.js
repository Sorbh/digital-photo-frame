const request = require('supertest');
const path = require('path');
const fs = require('fs-extra');
const app = require('../server'); // Assuming server exports the app

describe('Folder Controller API', () => {
  let server;
  const testUploadsDir = path.join(__dirname, 'test-uploads');
  
  beforeAll(async () => {
    // Create test folder structure
    await fs.ensureDir(path.join(testUploadsDir, 'vacation'));
    await fs.ensureDir(path.join(testUploadsDir, 'vacation/2023'));
    await fs.ensureDir(path.join(testUploadsDir, 'family'));
    
    // Create dummy test images (minimal valid JPEG files)
    const minimalJpeg = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0xFF, 0xD9
    ]);
    
    await fs.writeFile(path.join(testUploadsDir, 'vacation/beach.jpg'), minimalJpeg);
    await fs.writeFile(path.join(testUploadsDir, 'vacation/2023/sunset.jpg'), minimalJpeg);
    await fs.writeFile(path.join(testUploadsDir, 'family/portrait.jpg'), minimalJpeg);
  });
  
  afterAll(async () => {
    // Clean up test files
    await fs.remove(testUploadsDir);
    if (server) {
      server.close();
    }
  });

  describe('GET /api/folders', () => {
    test('should return folder structure', async () => {
      const response = await request(app)
        .get('/api/folders')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.folders).toBeInstanceOf(Array);
      expect(response.body.folders.length).toBeGreaterThan(0);
      
      const folder = response.body.folders[0];
      expect(folder).toHaveProperty('name');
      expect(folder).toHaveProperty('path');
      expect(folder).toHaveProperty('imageCount');
      expect(folder).toHaveProperty('hasSubfolders');
    });
  });

  describe('GET /api/folders/:folderPath', () => {
    test('should return specific folder contents', async () => {
      const response = await request(app)
        .get('/api/folders/vacation')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.folder).toHaveProperty('name', 'vacation');
      expect(response.body.folder).toHaveProperty('path', 'vacation');
      expect(response.body.folder).toHaveProperty('imageCount');
      expect(response.body.folder).toHaveProperty('breadcrumb');
      expect(response.body.subfolders).toBeInstanceOf(Array);
      expect(response.body.images).toBeInstanceOf(Array);
    });
    
    test('should return 404 for non-existent folder', async () => {
      const response = await request(app)
        .get('/api/folders/nonexistent')
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('FOLDER_NOT_FOUND');
    });
  });

  describe('GET /api/images/random', () => {
    test('should return random image without folder filter', async () => {
      const response = await request(app)
        .get('/api/images/random')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.image).toHaveProperty('id');
      expect(response.body.image).toHaveProperty('filename');
      expect(response.body.image).toHaveProperty('path');
      expect(response.body.image).toHaveProperty('folder');
      expect(response.body.image).toHaveProperty('url');
    });
    
    test('should return random image with folder filter', async () => {
      const response = await request(app)
        .get('/api/images/random?folder=vacation')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.image.folder).toMatch(/vacation/);
    });
    
    test('should return 404 for empty folder', async () => {
      const response = await request(app)
        .get('/api/images/random?folder=nonexistent')
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('FOLDER_EMPTY');
    });
  });

  describe('GET /api/folders/:folderPath/thumbnail', () => {
    test('should return folder thumbnail', async () => {
      const response = await request(app)
        .get('/api/folders/vacation/thumbnail')
        .expect(200);
      
      expect(response.headers['content-type']).toBe('image/jpeg');
      expect(response.body).toBeInstanceOf(Buffer);
    });
    
    test('should return 404 for folder without images', async () => {
      // Create empty folder for test
      const emptyFolderPath = path.join(testUploadsDir, 'empty');
      await fs.ensureDir(emptyFolderPath);
      
      const response = await request(app)
        .get('/api/folders/empty/thumbnail')
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('THUMBNAIL_NOT_FOUND');
      
      // Clean up
      await fs.remove(emptyFolderPath);
    });
  });

  describe('GET /api/images/:imageId/thumbnail', () => {
    test('should return image thumbnail', async () => {
      const response = await request(app)
        .get('/api/images/vacation%2Fbeach.jpg/thumbnail')
        .expect(200);
      
      expect(response.headers['content-type']).toBe('image/jpeg');
      expect(response.body).toBeInstanceOf(Buffer);
    });
    
    test('should return 404 for non-existent image', async () => {
      const response = await request(app)
        .get('/api/images/nonexistent.jpg/thumbnail')
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('IMAGE_NOT_FOUND');
    });
  });
});