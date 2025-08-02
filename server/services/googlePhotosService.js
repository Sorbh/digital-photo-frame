const { google } = require('googleapis');
const oauthManager = require('../utils/oauthManager');

class GooglePhotosService {
  constructor() {
    this.oauth2Client = null;
    this.initializeOAuth();
  }

  initializeOAuth() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      console.warn('Google Photos API credentials not configured. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI in .env file');
      return;
    }

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
  }

  async isAuthenticated(session) {
    if (!this.oauth2Client) {
      return false;
    }

    const tokens = oauthManager.getTokens(session);
    if (!tokens) {
      return false;
    }

    // Set the credentials and check if they're valid
    this.oauth2Client.setCredentials(tokens);
    
    try {
      // Try to refresh the token if it's expired
      await this.oauth2Client.getAccessToken();
      return true;
    } catch (error) {
      console.log('Token validation failed:', error.message);
      return false;
    }
  }

  async getUserInfo(session) {
    if (!await this.isAuthenticated(session)) {
      throw new Error('Not authenticated');
    }

    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const { data } = await oauth2.userinfo.get();
      
      return {
        email: data.email,
        name: data.name || data.email
      };
    } catch (error) {
      throw new Error('Failed to get user info: ' + error.message);
    }
  }

  async getAuthUrl(redirectUri) {
    if (!this.oauth2Client) {
      throw new Error('Google Photos API not configured');
    }

    const state = oauthManager.generateState();
    
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/photoslibrary.readonly'],
      state: state,
      prompt: 'consent'
    });

    return {
      authUrl,
      state
    };
  }

  async handleAuthCallback(code, state, session) {
    if (!this.oauth2Client) {
      throw new Error('Google Photos API not configured');
    }

    try {
      // Exchange authorization code for tokens
      const { tokens } = await this.oauth2Client.getToken(code);
      
      // Store tokens securely
      await oauthManager.storeTokens(session, tokens);
      
      // Set credentials for future API calls
      this.oauth2Client.setCredentials(tokens);
      
      // Get user info
      const userInfo = await this.getUserInfo(session);
      
      return {
        authenticated: true,
        userInfo
      };
    } catch (error) {
      throw new Error('Failed to exchange authorization code: ' + error.message);
    }
  }

  async revokeAccess(session) {
    if (!this.oauth2Client) {
      throw new Error('Google Photos API not configured');
    }

    const tokens = oauthManager.getTokens(session);
    if (tokens && tokens.access_token) {
      try {
        await this.oauth2Client.revokeToken(tokens.access_token);
      } catch (error) {
        console.log('Failed to revoke token:', error.message);
      }
    }

    // Clear stored tokens
    oauthManager.clearTokens(session);
  }
}

module.exports = new GooglePhotosService();