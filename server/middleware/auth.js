const bcrypt = require('bcryptjs');

// Check if user is authenticated
const requireAuth = (req, res, next) => {
  if (req.session && req.session.authenticated) {
    return next();
  }
  
  // If it's an API request, return JSON error
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  // For HTML requests, redirect to login
  return res.redirect('/login');
};

// Check if user is NOT authenticated (for login page)
const requireGuest = (req, res, next) => {
  if (req.session && req.session.authenticated) {
    return res.redirect('/admin');
  }
  next();
};

// Login handler
const login = async (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ message: 'Password is required' });
  }
  
  // Secure password comparison using bcrypt
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminPassword) {
    console.error('ADMIN_PASSWORD environment variable not set');
    return res.status(500).json({ message: 'Server configuration error' });
  }
  
  // For bcrypt hashed passwords, use bcrypt.compare()
  // For plain text passwords (development only), use direct comparison
  const isValidPassword = adminPassword.startsWith('$2') 
    ? await bcrypt.compare(password, adminPassword)
    : password === adminPassword;
  
  if (isValidPassword) {
    req.session.authenticated = true;
    req.session.loginTime = new Date();
    
    // If it's an API request, return JSON success
    if (req.headers['content-type'] === 'application/json') {
      return res.json({ message: 'Login successful', redirect: '/admin' });
    }
    
    // For form submissions, redirect to admin
    return res.redirect('/admin');
  }
  
  // Invalid password
  if (req.headers['content-type'] === 'application/json') {
    return res.status(401).json({ message: 'Invalid password' });
  }
  
  return res.redirect('/login?error=invalid');
};

// Logout handler
const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/login');
  });
};

// Get authentication status
const getAuthStatus = (req, res) => {
  res.json({
    authenticated: !!(req.session && req.session.authenticated),
    loginTime: req.session?.loginTime || null
  });
};

module.exports = {
  requireAuth,
  requireGuest,
  login,
  logout,
  getAuthStatus
};