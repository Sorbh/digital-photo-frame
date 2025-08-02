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
      const { code, state } = req.query;
      
      if (!code) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_AUTH_CODE',
            message: 'Authorization code is required'
          }
        });
      }

      const result = await googlePhotosService.handleAuthCallback(code, state, req.session);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_CALLBACK_FAILED',
          message: 'Failed to handle authentication callback',
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