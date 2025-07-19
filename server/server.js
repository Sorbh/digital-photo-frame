// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const session = require('express-session');

// Import middleware
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  console.error('SESSION_SECRET environment variable not set');
  process.exit(1);
}

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(logger);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/admin', express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', routes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize uploads directory
const initializeUploads = async () => {
  const uploadsDir = path.join(__dirname, process.env.UPLOAD_DIR || 'uploads');
  const defaultFolders = (process.env.DEFAULT_FOLDERS || 'family,vacation,holidays,misc').split(',');
  
  await fs.ensureDir(uploadsDir);
  
  for (const folder of defaultFolders) {
    await fs.ensureDir(path.join(uploadsDir, folder.trim()));
  }
};

// Start server
app.listen(PORT, async () => {
  await initializeUploads();
  console.log(`Digital Photo Frame Server running on port ${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
  console.log(`Slideshow: http://localhost:${PORT}/slideshow`);
  console.log(`API endpoint: http://localhost:${PORT}/api/random-image`);
});

module.exports = app;