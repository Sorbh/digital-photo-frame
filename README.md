# Digital Photo Frame

A web-based digital photo frame application that transforms any device with a browser into a smart photo display with remote image management capabilities.

## 🌟 Features

- **Cross-Platform Compatibility**: Works on any device with a modern web browser (tablets, desktops, laptops, smart TVs)
- **Web-Based Slideshow**: Full-screen photo display with smooth transitions and automatic advance
- **Remote Management**: Upload and organize photos from any device on your network
- **Finder-Like Admin Panel**: Drag-and-drop file management with folder organization
- **Material Design Interface**: Clean, modern UI following Material Design 3 principles
- **Keyboard Controls**: Full keyboard navigation and shortcuts
- **Wake Lock Support**: Prevents device sleep during slideshow
- **Responsive Design**: Optimized for various screen sizes and orientations

## 🚀 Quick Start

### Prerequisites

- Node.js 18.0 or higher
- npm or yarn package manager
- Modern web browser (Chrome 80+, Firefox 75+, Safari 13+, Edge 80+)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/digital-photo-frame.git
   cd digital-photo-frame
   ```

2. **Install dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Create environment configuration**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your settings:
   ```bash
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   
   # Authentication
   ADMIN_PASSWORD=your_secure_password
   
   # Upload Configuration
   MAX_FILE_SIZE=10485760
   UPLOAD_DIR=uploads
   
   # Image Processing
   IMAGE_QUALITY=85
   MAX_RESOLUTION_WIDTH=1920
   MAX_RESOLUTION_HEIGHT=1080
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Access the application**
   - **Slideshow**: Open `http://localhost:3000/slideshow` on your display device
   - **Admin Panel**: Open `http://localhost:3000/admin` to manage photos

## 📱 Usage

### Setting Up Your Digital Photo Frame

1. **Deploy on a local device** (Raspberry Pi, old laptop, etc.)
2. **Connect your display device** to the same network
3. **Navigate to the slideshow URL** on your display device
4. **Enter fullscreen mode** by pressing `F` or using the fullscreen button
5. **Manage photos remotely** using the admin panel from any device

### Managing Photos

#### Admin Panel Access
1. Navigate to `http://your-server-ip:3000/admin`
2. Login with your admin password
3. Use the Finder-like interface to organize photos

#### Uploading Photos
- **Drag and drop**: Drag image files directly into folders
- **Folder organization**: Create nested folders for better organization
- **Supported formats**: JPEG, PNG, WebP, GIF

#### Keyboard Shortcuts (Slideshow)
- `Space` or `K`: Play/pause slideshow
- `Right Arrow` or `N`: Next image
- `F`: Toggle fullscreen mode
- `I`: Show/hide image information

### Default Folder Structure
```
uploads/
├── family/     # Family photos
├── vacation/   # Vacation memories
├── holidays/   # Holiday celebrations
└── misc/       # Other photos
```

## 🛠️ Development

### Project Structure
```
digital-photo-frame/
├── documentation/           # Technical specifications
├── server/                  # Node.js backend
│   ├── controllers/         # Business logic
│   ├── middleware/          # Express middleware
│   ├── routes/             # API endpoints
│   ├── public/             # Frontend files
│   ├── uploads/            # Image storage
│   └── server.js           # Main entry point
└── README.md
```

### Development Setup

1. **Install development dependencies**
   ```bash
   cd server
   npm install
   ```

2. **Run in development mode**
   ```bash
   npm run dev
   ```

3. **Environment variables for development**
   ```bash
   NODE_ENV=development
   PORT=3000
   ADMIN_PASSWORD=admin123
   ```

### API Endpoints

#### Public Endpoints
- `GET /slideshow` - Slideshow interface
- `GET /login` - Login page
- `GET /api/random-image` - Get random image for slideshow
- `POST /api/auth/login` - User authentication

#### Protected Endpoints (Requires Authentication)
- `GET /admin` - Admin panel interface
- `GET /api/folders` - List folder contents
- `POST /api/folders` - Create new folder
- `DELETE /api/folders` - Delete folder
- `POST /api/upload` - Upload images
- `DELETE /api/images` - Delete images

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `NODE_ENV` | development | Environment mode |
| `ADMIN_PASSWORD` | - | Admin panel password (required) |
| `MAX_FILE_SIZE` | 10485760 | Maximum upload size (10MB) |
| `UPLOAD_DIR` | uploads | Image storage directory |
| `IMAGE_QUALITY` | 85 | JPEG compression quality |
| `MAX_RESOLUTION_WIDTH` | 1920 | Maximum image width |
| `MAX_RESOLUTION_HEIGHT` | 1080 | Maximum image height |

### Slideshow Configuration

The slideshow automatically:
- Displays random images from all folders
- Advances every 15 seconds
- Applies smooth fade transitions (1 second)
- Optimizes display for landscape/portrait orientations
- Prevents device sleep using Wake Lock API

## 🚀 Deployment

### Local Network Deployment

1. **Find your server's IP address**
   ```bash
   # Linux/macOS
   ifconfig | grep inet
   
   # Windows
   ipconfig
   ```

2. **Update environment for production**
   ```bash
   NODE_ENV=production
   PORT=3000
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Access from any device on your network**
   - Slideshow: `http://YOUR_SERVER_IP:3000/slideshow`
   - Admin: `http://YOUR_SERVER_IP:3000/admin`

### Production Considerations

- Use a process manager like PM2 for production deployment
- Set up reverse proxy with Nginx for better performance
- Configure firewall rules for network access
- Regular backups of the uploads directory
- Monitor disk space for image storage

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Getting Started
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes following our coding standards
4. Test your changes thoroughly
5. Commit with clear messages: `git commit -m 'Add amazing feature'`
6. Push to your branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Coding Standards
- **Backend**: ESLint with standard JavaScript configuration
- **Frontend**: Vanilla JavaScript (ES6+), no frameworks
- **CSS**: Material Design 3 principles, mobile-first approach
- **Architecture**: MVC pattern for backend, modular components for frontend

### Development Guidelines
- Use async/await for asynchronous operations
- Implement proper error handling
- Follow RESTful API design principles
- Write responsive, accessible frontend code
- Include proper logging and debugging information

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Material Design for UI/UX inspiration
- Sharp.js for efficient image processing
- Express.js for robust backend framework
- The open source community for inspiration and tools

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/sorbh/digital-photo-frame/issues)
- **Documentation**: See the `/documentation` directory for technical specifications
- **Discussions**: [GitHub Discussions](https://github.com/sorbh/digital-photo-frame/discussions)

---

**Transform any device into a beautiful digital photo frame! 📸✨**