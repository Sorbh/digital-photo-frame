const path = require('path');
const fs = require('fs');

class ViewController {
  // Serve admin panel
  serveAdmin(req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
  }

  // Serve access accounts page
  serveAccessAccounts(req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'access-accounts.html'));
  }

  // Serve slideshow page
  serveSlideshow(req, res) {
    const slideshowPath = path.join(__dirname, '..', 'public', 'slideshow.html');
    const defaultInterval = process.env.DEFAULT_SLIDESHOW_INTERVAL || 15000;
    
    // Read the HTML file
    fs.readFile(slideshowPath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading slideshow.html:', err);
        return res.status(500).send('Error loading slideshow');
      }
      
      // Replace the hardcoded interval with the environment variable
      const modifiedData = data.replace(
        /this\.interval = 15000;.*$/m,
        `this.interval = ${defaultInterval}; // From DEFAULT_SLIDESHOW_INTERVAL`
      );
      
      res.setHeader('Content-Type', 'text/html');
      res.send(modifiedData);
    });
  }

  // Serve folder selection page
  serveFolderSelection(req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'folder-selection.html'));
  }

  // Serve login page
  serveLogin(req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
  }

  // Redirect root to slideshow
  redirectToSlideshow(req, res) {
    res.redirect('/slideshow');
  }
}

module.exports = new ViewController();