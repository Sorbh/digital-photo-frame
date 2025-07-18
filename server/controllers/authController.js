const { login, logout, getAuthStatus } = require('../middleware/auth');

class AuthController {
  // Handle login
  async handleLogin(req, res) {
    return login(req, res);
  }

  // Handle logout
  async handleLogout(req, res) {
    return logout(req, res);
  }

  // Get authentication status
  async getStatus(req, res) {
    return getAuthStatus(req, res);
  }
}

module.exports = new AuthController();