const path = require('path');

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
    res.sendFile(path.join(__dirname, '..', 'public', 'slideshow.html'));
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