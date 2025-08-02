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

  // Create session for Google Picker
  createPickerSession: asyncHandler(async (req, res) => {
    try {
      // Check authentication
      const tokens = oauthManager.getStoredTokens(req.session);
      const isAuthenticated = tokens && tokens.access_token && !oauthManager.isTokenExpired(tokens);
      
      if (!isAuthenticated) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'NOT_AUTHENTICATED',
            message: 'Google Photos authentication required'
          }
        });
      }

      // Generate unique request ID for Google Photos Picker API
      const requestId = require('crypto').randomUUID();
      
      // Call Google Photos Picker API to create session
      const fetch = require('node-fetch');
      const pickerResponse = await fetch(`https://photospicker.googleapis.com/v1/sessions?requestId=${requestId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pickingConfig: {
            maxItemCount: "100"
          }
        })
      });

      if (!pickerResponse.ok) {
        const errorData = await pickerResponse.json();
        console.error('Google Photos Picker API error:', errorData);
        
        if (pickerResponse.status === 412) {
          // FAILED_PRECONDITION - user doesn't have active Google Photos account
          return res.status(400).json({
            success: false,
            error: {
              code: 'NO_GOOGLE_PHOTOS_ACCOUNT',
              message: 'User does not have an active Google Photos account'
            }
          });
        }
        
        if (pickerResponse.status === 429) {
          // RESOURCE_EXHAUSTED - too many sessions
          return res.status(429).json({
            success: false,
            error: {
              code: 'TOO_MANY_SESSIONS',
              message: 'Too many picker sessions created. Please try again later.'
            }
          });
        }

        throw new Error(`Picker API error: ${pickerResponse.status} ${pickerResponse.statusText}`);
      }

      const pickerData = await pickerResponse.json();
      
      // Store picker session for cleanup later
      req.session.googlePickerSession = {
        id: pickerData.id,
        created: new Date(),
        accessToken: tokens.access_token,
        requestId: requestId
      };

      res.json({
        success: true,
        data: {
          sessionId: pickerData.id,
          pickerUrl: pickerData.pickerUri,
          requestId: requestId
        }
      });
    } catch (error) {
      console.error('Create picker session error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SESSION_CREATE_FAILED',
          message: 'Failed to create picker session',
          details: error.message
        }
      });
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
      if (req.session.googlePickerSession) {
        delete req.session.googlePickerSession;
      }
      
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