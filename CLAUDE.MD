# Digital Photo Frame Web Application

A web-based digital photo frame application that transforms any device with a browser into a smart photo display with image management capabilities.

## Overview
- **Backend**: Node.js server for image upload, categorization, and management
- **Web Slideshow**: Browser-based slideshow interface for displaying photos with automatic transitions
- **Purpose**: Transform any device with a browser into a digital photo frame with remote image management
- **Target**: Personal/family use for displaying photos with easy content management

## Requirements

### System Requirements
- Any device with a modern web browser (tablet, desktop, laptop, smart TV)
- Node.js server environment (local network or cloud)
- Network connectivity for device and server communication
- Storage space for image files

### Dependencies
- **Backend**: Node.js, Express.js, Multer (file uploads), Sharp (image processing)
- **Frontend**: HTML5, CSS3, JavaScript (vanilla ES6+), Web APIs (Fullscreen, Keyboard)
- **Database**: File system-based storage for image metadata

## Architecture

### Backend Structure
```
/server
├── /controllers
│   ├── imageController.js
│   ├── folderController.js
│   └── viewController.js
├── /middleware
│   ├── upload.js
│   ├── errorHandler.js
│   └── logger.js
├── /routes
│   ├── index.js
│   ├── api.js
│   └── views.js
├── /uploads
│   ├── /family
│   ├── /vacation
│   ├── /holidays
│   └── /misc
├── /public
│   ├── admin.html
│   ├── admin.css
│   ├── admin.js
│   └── slideshow.html
└── server.js
```

### Frontend Structure
```
/public
├── admin.html
├── admin.css
├── admin.js
├── slideshow.html
└── slideshow.css (embedded)
```

### Data Flow
1. Images uploaded to Node.js server via admin web interface
2. Images organized into folders manually through admin panel
3. Web slideshow calls `/api/random-image` API to get random photos
4. Slideshow displays single random image in full-screen with smooth transitions
5. Automatic API calls every 15 seconds to refresh with new random images

## Implementation Notes

### MVC Architecture
The backend follows a clean MVC (Model-View-Controller) pattern with proper separation of concerns:

**Controllers:**
- `imageController.js` - Handles image upload, processing, retrieval, and deletion
- `folderController.js` - Manages folder operations (create, read, delete)
- `viewController.js` - Serves static HTML pages and handles redirects

**Routes:**
- `index.js` - Main router that mounts all route modules
- `api.js` - API endpoints for image and folder operations
- `views.js` - Routes for serving HTML pages

**Middleware:**
- `upload.js` - Multer configuration for file uploads with validation
- `errorHandler.js` - Global error handling with proper HTTP status codes
- `logger.js` - Request logging for debugging and monitoring

**Benefits:**
- **Separation of Concerns**: Each component has a single responsibility
- **Maintainability**: Easy to modify individual features without affecting others
- **Scalability**: Simple to add new controllers, routes, or middleware
- **Error Handling**: Centralized error management with consistent responses
- **Code Reusability**: Controllers can be easily tested and reused

### Backend Specifications
- **Framework**: Express.js for minimal REST API
- **Storage**: Organized folder structure by categories
- **Image Serving**: Static file serving for uploaded images
- **API Endpoints**: 
  - `GET /api/random-image` - Get random image from any folder with folder name, relative path, and full URL
    - Response format: `{ "path": "/uploads/image.jpg", "url": "http://localhost:3000/uploads/image.jpg", "folder": "family", "filename": "image.jpg" }`
  - `GET /api/folders` - Get folder contents with files and subfolders
  - `POST /api/folders` - Create new folder
  - `DELETE /api/folders` - Delete folder and contents
  - `POST /api/upload` - Upload images with processing and optimization
  - `DELETE /api/images` - Delete specific image
  - `GET /admin` - Admin panel web interface (for manual file management)
  - `GET /slideshow` - Web-based slideshow interface for displaying photos with 15-second intervals

### Frontend Specifications
- **Framework**: Vanilla HTML5, CSS3, and JavaScript for maximum compatibility
- **Display Mode**: Full-screen slideshow with smooth fade transitions
- **Image Loading**: Progressive loading with error handling and retry logic
- **Offline Support**: Browser caching for recently viewed images
- **UI**: Minimal, clean interface optimized for photo display
- **Controls**: Touch and keyboard controls, play/pause, fullscreen mode
- **API Integration**: Uses only `/api/random-image` endpoint for displaying random photos from all folders with full URL support
- **Simplicity**: No complex navigation or category selection - just random photo display with automatic 15-second intervals

### Web Slideshow Specifications
- **Interface**: Full-screen browser-based slideshow for instant photo viewing
- **Auto-advance**: 15-second intervals between images with smooth fade transitions
- **Controls**: Play/pause, next image, fullscreen mode, and information overlay
- **Keyboard Shortcuts**: 
  - Spacebar/K: Play/pause slideshow
  - Right Arrow/N: Next image
  - F: Toggle fullscreen mode
  - I: Show/hide image information
- **Progress Indicator**: Visual progress bar showing time until next image
- **Image Information**: Overlay displaying filename and folder name
- **Error Handling**: Graceful handling of failed API calls and image loading
- **Responsive Design**: Works on desktop, tablet, and mobile browsers
- **API Integration**: Uses `/api/random-image` endpoint with full URL support
- **Image Fitting**: Automatic scaling to fit screen while maintaining aspect ratio

### Admin Panel Design
- **Design System**: Material Design 3 principles and components
- **Typography**: Roboto font family with proper hierarchy
- **Colors**: Material Design color palette with primary (#1976D2) and semantic colors
- **Icons**: Material Design Icons for all UI elements
- **Layout**: Fixed grid system with 150px x 150px items and 16px gaps
- **Grid**: CSS Grid with `repeat(auto-fill, 150px)` for consistent sizing
- **Animations**: Material Design motion with cubic-bezier easing
- **Accessibility**: Focus indicators, proper contrast ratios, keyboard navigation

### Technical Preferences
- RESTful API design
- Responsive image loading with progressive enhancement
- Automatic image optimization for tablet resolution
- Configuration file for server IP, refresh intervals, slideshow timing
- Error handling for network connectivity issues

## Features

### Core Features
- [x] macOS Finder-like admin panel for image management
- [x] Full-page file explorer interface with navigation
- [x] Folder creation and management with nested folder support
- [x] Folder deletion with safety checks
- [x] Click-to-navigate folder browsing
- [x] Drag-and-drop image upload directly into folders
- [x] Create folders inside existing folders (nested structure)
- [x] Fixed grid layout with 150px x 150px items for professional appearance
- [x] Material Design 3 styling with proper spacing and elevation
- [x] Simplified navigation with back button only in nested folders
- [x] Automatic image categorization by folder
- [x] Random image API endpoint for slideshow functionality
- [x] Simplified backend with only random-image API
- [x] Web-based slideshow interface with 15-second intervals
- [x] Smooth fade transitions between images
- [x] Touch controls (tap to pause/play, keyboard shortcuts)
- [x] Random image display using API endpoint
- [x] Automatic image rotation and scaling
- [x] Fullscreen mode support
- [x] Progress bar showing time until next image

### Advanced Features
- [x] Breadcrumb navigation in admin panel
- [x] Context menu for file operations (right-click functionality)
- [x] Toast notifications for user feedback
- [x] Upload progress indicators
- [x] Keyboard shortcuts and accessibility features
- [ ] Folder tree view with expandable directories
- [ ] Bulk image operations (select multiple, delete, move)
- [ ] Image preview and metadata display
- [ ] Scheduled slideshow modes (different photos at different times)
- [ ] Remote control via web interface
- [ ] Favorites system
- [ ] Automatic photo sync from cloud services
- [ ] Sleep/wake scheduling for tablet

## Configuration

### Server Configuration
```javascript
{
  "port": 3000,
  "uploadPath": "./uploads",
  "maxFileSize": "10MB",
  "supportedFormats": ["jpg", "jpeg", "png", "gif"],
  "imageQuality": 85,
  "maxResolution": "1920x1080"
}
```

### Web Slideshow Configuration
```javascript
{
  "interval": 15000, // 15 seconds between images
  "transitionDuration": 1000, // 1 second fade transition
  "showControls": true, // Show play/pause/next controls
  "showProgress": true, // Show progress bar
  "showInfo": true, // Show image information overlay
  "autoHideInfo": 3000, // Auto-hide info after 3 seconds
  "keyboardShortcuts": true, // Enable keyboard controls
  "fullscreenOnStart": false, // Start in fullscreen mode
  "errorRetryDelay": 5000 // Wait 5 seconds before retrying failed requests
}
```

## Tasks

### Phase 1: Backend Setup ✅ COMPLETED
- [x] Initialize Node.js project with Express
- [x] Set up file upload endpoint with Multer
- [x] Implement image processing with Sharp
- [x] Create folder-based categorization system
- [x] Build REST API endpoints for image management
- [x] Create Finder-like admin panel interface
- [x] Implement folder navigation system
- [x] Add drag-and-drop upload functionality
- [x] Implement breadcrumb navigation
- [x] Add dynamic folder creation functionality
- [x] Create web-based slideshow interface
- [x] Implement 15-second auto-advance with smooth transitions
- [x] Add play/pause and navigation controls
- [x] Implement keyboard shortcuts and fullscreen mode
- [x] Add progress indicator and image information overlay
- [x] Refactor server into MVC architecture with controllers, routes, and middleware
- [x] Implement proper error handling and logging
- [x] Create modular and maintainable code structure

### Phase 1.5: Web Slideshow ✅ COMPLETED
- [x] Create responsive HTML5 slideshow interface
- [x] Implement smooth CSS transitions and animations
- [x] Add JavaScript API integration with random-image endpoint
- [x] Implement 15-second auto-advance timer
- [x] Add play/pause functionality with visual controls
- [x] Implement keyboard shortcuts (spacebar, arrows, f, i)
- [x] Add fullscreen mode support
- [x] Create progress bar with countdown visualization
- [x] Add image information overlay with auto-hide
- [x] Implement error handling and retry logic
- [x] Add responsive design for mobile and desktop
- [x] Optimize for digital photo frame use cases

### Phase 2: Integration & Testing
- [x] Test image upload and display workflow
- [x] Optimize performance for web browsers
- [x] Add error handling and retry capabilities
- [x] Implement automatic refresh mechanisms
- [x] Test with various image formats and sizes

### Phase 3: Enhancement
- [ ] Add category selection in slideshow
- [ ] Implement slideshow timing configuration
- [ ] Add transition effects options
- [ ] Create admin interface for bulk operations
- [ ] Add scheduling and automation features

## Context

This project aims to transform any device with a modern browser into a dedicated digital photo frame. The solution is lightweight and web-based, running smoothly on various devices while providing modern features like remote image management and automatic slideshow transitions.

The backend serves as both an API and admin interface, allowing easy photo management from any device on the network. The web slideshow provides an immediate, cross-platform solution for photo display that works on tablets, desktops, laptops, smart TVs, and any device with a modern browser, requiring no app installation or platform-specific development.

Key considerations:
- Cross-platform compatibility (works on any device with a browser)
- Network reliability and offline functionality
- User-friendly photo management workflow
- Long-term operation as dedicated display device
- Family-friendly interface for non-technical users
- Immediate usability without app installation
- Smooth transitions and professional presentation
- Lightweight performance for older devices
- Browser-based solution with no dependencies