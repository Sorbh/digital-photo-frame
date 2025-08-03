const oauthManager = require('../utils/oauthManager');

// Simple async handler for error handling
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const googlePhotosController = {
  // Get authentication status
  getAuthStatus: asyncHandler(async (req, res) => {
    try {
      const tokens = oauthManager.getStoredTokens(req.session);
      const isAuthenticated = tokens && tokens.access_token && !oauthManager.isTokenExpired(tokens);

      res.json({
        success: true,
        data: {
          authenticated: isAuthenticated,
          userInfo: isAuthenticated ? { email: tokens.userEmail || 'Unknown' } : null
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
      const authUrl = oauthManager.getAuthUrl(redirectUri);

      res.json({
        success: true,
        data: {
          authUrl,
          state: 'google-photos-auth'
        }
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
                  window.location.href = '/admin';
                }
              </script>
            </body>
          </html>
        `);
      }

      // Exchange code for tokens
      const tokens = await oauthManager.exchangeCodeForTokens(code);
      
      // Store tokens in session
      await oauthManager.storeTokens(req.session, tokens);

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
                  data: { authenticated: true }
                }, '*');
                window.close();
              } else {
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
      const tokens = oauthManager.getStoredTokens(req.session);
      
      if (tokens && tokens.access_token) {
        await oauthManager.revokeTokens(tokens.access_token);
      }
      
      // Clear session data
      oauthManager.clearStoredTokens(req.session);
      
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
  })
};

module.exports = googlePhotosController;