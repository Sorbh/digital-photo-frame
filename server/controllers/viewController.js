const path = require('path');

class ViewController {
  // Serve admin panel
  serveAdmin(req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
  }

  // Serve slideshow page
  serveSlideshow(req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'slideshow.html'));
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