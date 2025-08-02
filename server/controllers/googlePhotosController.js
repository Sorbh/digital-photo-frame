const googlePhotosService = require('../services/googlePhotosService');

// Simple async handler for error handling
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const googlePhotosController = {
  // Get authentication status
  getAuthStatus: asyncHandler(async (req, res) => {
    try {
      const isAuthenticated = await googlePhotosService.isAuthenticated(req.session);
      const userInfo = isAuthenticated ? await googlePhotosService.getUserInfo(req.session) : null;

      res.json({
        success: true,
        data: {
          authenticated: isAuthenticated,
          userInfo
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_CHECK_FAILED',
          message: 'Failed to check authentication status',
          details: error.message
        }
      });
    }
  }),

  // Initiate OAuth flow
  initiateAuth: asyncHandler(async (req, res) => {
    try {
      const { redirectUri } = req.body;
      const authData = await googlePhotosService.getAuthUrl(redirectUri);

      res.json({
        success: true,
        data: authData
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_INIT_FAILED',
          message: 'Failed to initiate authentication',
          details: error.message
        }
      });
    }
  }),

  // Handle OAuth callback
  handleCallback: asyncHandler(async (req, res) => {
    try {
      const { code, state, error } = req.query;
      
      // Handle OAuth errors (user denied access, etc.)
      if (error) {
        console.log('OAuth error:', error);
        return res.send(`
          <html>
            <head><title>Google Photos Authentication</title></head>
            <body>
              <script>
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'google-photos-auth',
                    success: false,
                    error: '${error === 'access_denied' ? 'Access denied by user' : 'Authentication failed'}'
                  }, '*');
                  window.close();
                } else {
                  alert('Authentication failed: ${error}');
                  window.location.href = '/admin';
                }
              </script>
            </body>
          </html>
        `);
      }
      
      if (!code) {
        return res.send(`
          <html>
            <head><title>Google Photos Authentication</title></head>
            <body>
              <script>
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'google-photos-auth',
                    success: false,
                    error: 'No authorization code received'
                  }, '*');
                  window.close();
                } else {
                  alert('Authentication failed: No authorization code received');
                  window.location.href = '/admin';
                }
              </script>
            </body>
          </html>
        `);
      }

      const result = await googlePhotosService.handleAuthCallback(code, state, req.session);

      // Send success response to popup window
      res.send(`
        <html>
          <head><title>Google Photos Authentication</title></head>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'google-photos-auth',
                  success: true,
                  data: ${JSON.stringify(result)}
                }, '*');
                window.close();
              } else {
                alert('Authentication successful! Redirecting...');
                window.location.href = '/admin';
              }
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.send(`
        <html>
          <head><title>Google Photos Authentication</title></head>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'google-photos-auth',
                  success: false,
                  error: 'Authentication failed: ${error.message}'
                }, '*');
                window.close();
              } else {
                alert('Authentication failed: ${error.message}');
                window.location.href = '/admin';
              }
            </script>
          </body>
        </html>
      `);
    }
  }),

  // Revoke access and logout
  revokeAccess: asyncHandler(async (req, res) => {
    try {
      await googlePhotosService.revokeAccess(req.session);
      
      res.json({
        success: true,
        data: {
          message: 'Google Photos access revoked successfully'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'REVOKE_FAILED',
          message: 'Failed to revoke Google Photos access',
          details: error.message
        }
      });
    }
  }),

  // Placeholder for future endpoints
  getAlbums: asyncHandler(async (req, res) => {
    res.json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Albums endpoint not yet implemented'
      }
    });
  }),

  getPhotos: asyncHandler(async (req, res) => {
    res.json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Photos endpoint not yet implemented'
      }
    });
  }),

  startSync: asyncHandler(async (req, res) => {
    res.json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Sync endpoint not yet implemented'
      }
    });
  })
};

module.exports = googlePhotosController;