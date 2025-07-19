# Digital Photo Frame - Project Specification

* **Purpose:** A web-based digital photo frame application that transforms any device with a browser into a smart photo display with remote image management capabilities.
* **Scope:** Cross-platform photo display solution with browser-based slideshow interface, Node.js backend for image management, and admin panel for photo organization. Excludes mobile apps, desktop applications, or cloud storage integration.
* **Key Performance Indicators (KPIs):** 
  - Page load time < 3 seconds
  - Image transition smoothness (60 FPS)
  - 99% uptime for local network deployment
  - Support for devices with 1GB+ RAM

## Rules

- **ALWAYS** use vanilla JavaScript for frontend (no frameworks) for maximum compatibility
- **NEVER** create files unless absolutely necessary for achieving your goal
- **ALWAYS** prefer editing existing files to creating new ones
- **NEVER** proactively create documentation files unless explicitly requested
- **ALWAYS** follow MVC architecture pattern for backend
- **ALWAYS** implement proper error handling and retry logic
- **ALWAYS** use environment variables for configuration
- **ALWAYS** optimize images for web display (max 1920x1080)
- **NEVER** commit secrets or environment files to repository
- **ALWAYS** test on multiple browser types and devices
- **ALWAYS** implement responsive design for various screen sizes

## Structure

```
digital-photo-frame/
├── /documentation/              # Project documentation
│   ├── project.spec.md         # This file - project overview
│   ├── backend.spec.md         # Backend technical specification
│   └── frontend.spec.md        # Frontend technical specification
├── /server/                    # Node.js backend server
│   ├── /controllers/           # MVC controllers
│   ├── /middleware/            # Express middleware
│   ├── /routes/               # API and view routes
│   ├── /uploads/              # Image storage (folders)
│   ├── /public/               # Static frontend files
│   ├── .env                   # Environment configuration
│   └── server.js              # Main server entry point
├── /public/                   # Web frontend files
│   ├── admin.html             # Admin panel interface
│   ├── admin.css              # Admin panel styles
│   ├── admin.js               # Admin panel functionality
│   ├── slideshow.html         # Photo slideshow interface
│   └── login.html             # Authentication page
├── package.json               # Node.js dependencies
├── CLAUDE.md                  # Project instructions for AI
└── README.md                  # Project setup and usage
```