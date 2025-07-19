# Digital Photo Frame - Backend Technical Specification

## 1. Architecture & Technology Stack

* **1.1 Architectural Style:** MVC (Model-View-Controller) with Express.js middleware pattern
* **1.2 Frameworks & Libraries:**
    * **Runtime:** Node.js 18.0+
    * **Web Framework:** Express.js 4.18+
    * **File Upload:** Multer 1.4+ with memory storage
    * **Image Processing:** Sharp 0.32+ for optimization and resizing
    * **Environment:** dotenv 16.0+ for configuration management
    * **Security:** express-session for authentication
    * **Logging:** Custom middleware for request logging

* **1.3 Directory Structure:**

    ```
    /server
    ├── /controllers
    │   ├── imageController.js      # Image CRUD operations
    │   ├── folderController.js     # Folder management
    │   ├── viewController.js       # HTML page serving
    │   └── authController.js       # Authentication logic
    ├── /middleware
    │   ├── upload.js              # Multer configuration
    │   ├── errorHandler.js        # Global error handling
    │   ├── logger.js              # Request logging
    │   └── auth.js                # Authentication middleware
    ├── /routes
    │   ├── index.js               # Main router
    │   ├── api.js                 # API endpoints
    │   ├── views.js               # Static page routes
    │   └── auth.js                # Authentication routes
    ├── /uploads                   # Image storage
    │   ├── /family               # Default folder
    │   ├── /vacation             # Default folder
    │   ├── /holidays             # Default folder
    │   └── /misc                 # Default folder
    ├── /public                   # Static frontend files
    ├── .env                      # Environment variables
    └── server.js                 # Application entry point
    ```

* **1.4. Coding Standards & Conventions:**
    * **Linting Rules:** ESLint with standard JavaScript configuration
    * **Formatting:** 2-space indentation, semicolons required
    * **Naming Conventions:** 
      - Files: camelCase.js
      - Functions: camelCase
      - Constants: UPPER_SNAKE_CASE
      - Routes: kebab-case

---

## 2. API Specification

### 2.1. Public Endpoints (No Authentication)

* **GET /slideshow** - Serves slideshow HTML interface
* **GET /login** - Serves login page
* **POST /api/auth/login** - User authentication
* **GET /api/auth/status** - Check authentication status
* **GET /api/random-image** - Get random image for slideshow

### 2.2. Protected Endpoints (Authentication Required)

* **GET /admin** - Serves admin panel interface
* **POST /api/auth/logout** - User logout
* **GET /api/folders** - List folder contents
* **POST /api/folders** - Create new folder
* **DELETE /api/folders** - Delete folder and contents
* **POST /api/upload** - Upload and process images
* **DELETE /api/images** - Delete specific image

### 2.3. Response Formats

```javascript
// Random Image Response
{
  "path": "/uploads/family/image.jpg",
  "url": "http://localhost:3000/uploads/family/image.jpg", 
  "folder": "family",
  "filename": "image.jpg"
}

// Folder Contents Response
{
  "folders": ["subfolder1", "subfolder2"],
  "files": [
    {
      "name": "image1.jpg",
      "path": "/uploads/folder/image1.jpg",
      "size": 1024000
    }
  ]
}
```

---

## 3. Global Concepts

* **3.1. Authentication & Authorization:** 
  - Session-based authentication with 24-hour expiry
  - Password protection via ADMIN_PASSWORD environment variable
  - Public slideshow access, protected admin operations

* **3.2. Error Handling:** 
  - Global error middleware with proper HTTP status codes
  - Graceful handling of file system errors
  - API error responses in JSON format

* **3.3. Image Processing:**
  - Automatic optimization with Sharp (JPEG quality 85)
  - Maximum resolution 1920x1080 for web display
  - EXIF data removal for privacy

* **3.4. File Management:**
  - Organized folder structure in /uploads
  - Recursive folder operations with safety checks
  - Static file serving with Express

---

## 4. Deployment & Build Process

* **4.1. Environment Variables:**
  ```bash
  PORT=3000                      # Server port
  NODE_ENV=development           # Environment mode
  ADMIN_PASSWORD=your_password   # Admin authentication
  MAX_FILE_SIZE=10485760        # 10MB upload limit
  UPLOAD_DIR=uploads            # Image storage directory
  IMAGE_QUALITY=85              # JPEG compression quality
  MAX_RESOLUTION_WIDTH=1920     # Image width limit
  MAX_RESOLUTION_HEIGHT=1080    # Image height limit
  ```

* **4.2. Build Commands:**
  - Development: `npm start`
  - Production: `NODE_ENV=production npm start`

* **4.3. Deployment Pipeline:**
  - Local development server
  - Environment variable configuration
  - Static file serving setup

---

## 5. Coding Rules

* Use async/await for asynchronous operations
* Implement proper error handling in all controllers
* Validate file types and sizes before processing
* Use environment variables for all configuration
* Follow RESTful API design principles
* Implement middleware for common functionality
* Use Sharp for all image processing operations
* Maintain separation of concerns (MVC pattern)
* Log all requests and errors for debugging
* Sanitize file paths to prevent directory traversal