const { google } = require('googleapis');
const oauthManager = require('../utils/oauthManager');
const googlePhotosApiService = require('./googlePhotosApiService');
const googlePhotosCache = require('../utils/googlePhotosCache');

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

    // Set the credentials
    this.oauth2Client.setCredentials(tokens);
    
    try {
      // Check if token is expired and refresh if needed
      if (oauthManager.isTokenExpired(tokens)) {
        console.log('Token expired, attempting refresh...');
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        
        // Store the refreshed tokens
        await oauthManager.storeTokens(session, credentials);
        this.oauth2Client.setCredentials(credentials);
        console.log('Token refreshed successfully');
      }
      
      // Verify access by making a simple API call
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      await oauth2.userinfo.get();
      
      return true;
    } catch (error) {
      console.log('Token validation/refresh failed:', error.message);
      // Clear invalid tokens
      oauthManager.clearTokens(session);
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

    // Get user info before clearing cache
    let userId = null;
    try {
      const userInfo = await this.getUserInfo(session);
      userId = userInfo.email;
    } catch (error) {
      console.log('Could not get user info for cache cleanup:', error.message);
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
    
    // Clear user's cached data
    if (userId) {
      googlePhotosCache.invalidateUserData(userId);
    }
  }

  async getAlbums(session, pageSize = 50, pageToken = null) {
    if (!await this.isAuthenticated(session)) {
      throw new Error('Not authenticated with Google Photos');
    }

    try {
      const userInfo = await this.getUserInfo(session);
      const userId = userInfo.email;

      // Check cache first
      const cached = googlePhotosCache.getCachedAlbums(userId, pageToken);
      if (cached) {
        console.log('Returning cached albums');
        return cached;
      }

      // Get fresh access token
      const tokens = oauthManager.getTokens(session);
      this.oauth2Client.setCredentials(tokens);
      const { token: accessToken } = await this.oauth2Client.getAccessToken();

      // Fetch from API
      const result = await googlePhotosApiService.getAlbums(accessToken, pageSize, pageToken);
      
      // Cache the result
      googlePhotosCache.cacheAlbums(userId, result.albums, result.nextPageToken, pageToken);
      
      return result;
    } catch (error) {
      throw new Error(`Failed to get albums: ${error.message}`);
    }
  }

  async getAlbumPhotos(session, albumId, pageSize = 50, pageToken = null) {
    if (!await this.isAuthenticated(session)) {
      throw new Error('Not authenticated with Google Photos');
    }

    try {
      const userInfo = await this.getUserInfo(session);
      const userId = userInfo.email;

      // Check cache first
      const cached = googlePhotosCache.getCachedAlbumPhotos(userId, albumId, pageToken);
      if (cached) {
        console.log('Returning cached album photos');
        return { mediaItems: cached.photos, nextPageToken: cached.nextPageToken };
      }

      // Get fresh access token
      const tokens = oauthManager.getTokens(session);
      this.oauth2Client.setCredentials(tokens);
      const { token: accessToken } = await this.oauth2Client.getAccessToken();

      // Fetch from API
      const result = await googlePhotosApiService.getAlbumPhotos(accessToken, albumId, pageSize, pageToken);
      
      // Cache the result
      googlePhotosCache.cacheAlbumPhotos(userId, albumId, result.mediaItems, result.nextPageToken, pageToken);
      
      return result;
    } catch (error) {
      throw new Error(`Failed to get album photos: ${error.message}`);
    }
  }

  async getLibraryPhotos(session, pageSize = 50, pageToken = null) {
    if (!await this.isAuthenticated(session)) {
      throw new Error('Not authenticated with Google Photos');
    }

    try {
      const userInfo = await this.getUserInfo(session);
      const userId = userInfo.email;

      // Check cache first
      const cached = googlePhotosCache.getCachedLibraryPhotos(userId, pageToken);
      if (cached) {
        console.log('Returning cached library photos');
        return { mediaItems: cached.photos, nextPageToken: cached.nextPageToken };
      }

      // Get fresh access token
      const tokens = oauthManager.getTokens(session);
      this.oauth2Client.setCredentials(tokens);
      const { token: accessToken } = await this.oauth2Client.getAccessToken();

      // Fetch from API
      const result = await googlePhotosApiService.getLibraryPhotos(accessToken, pageSize, pageToken);
      
      // Cache the result
      googlePhotosCache.cacheLibraryPhotos(userId, result.mediaItems, result.nextPageToken, pageToken);
      
      return result;
    } catch (error) {
      throw new Error(`Failed to get library photos: ${error.message}`);
    }
  }

  async getMediaItem(session, mediaItemId) {
    if (!await this.isAuthenticated(session)) {
      throw new Error('Not authenticated with Google Photos');
    }

    try {
      const userInfo = await this.getUserInfo(session);
      const userId = userInfo.email;

      // Check cache first
      const cached = googlePhotosCache.getCachedMediaItem(userId, mediaItemId);
      if (cached) {
        console.log('Returning cached media item');
        return cached;
      }

      // Get fresh access token
      const tokens = oauthManager.getTokens(session);
      this.oauth2Client.setCredentials(tokens);
      const { token: accessToken } = await this.oauth2Client.getAccessToken();

      // Fetch from API
      const result = await googlePhotosApiService.getMediaItem(accessToken, mediaItemId);
      
      // Cache the result
      googlePhotosCache.cacheMediaItem(userId, mediaItemId, result);
      
      return result;
    } catch (error) {
      throw new Error(`Failed to get media item: ${error.message}`);
    }
  }

  // Helper method to get thumbnail URLs
  getThumbnailUrl(baseUrl, size = 200) {
    return googlePhotosApiService.getThumbnailUrl(baseUrl, size);
  }

  // Helper method to get download URLs
  getDownloadUrl(baseUrl, width = null, height = null) {
    return googlePhotosApiService.getDownloadUrl(baseUrl, width, height);
  }
}

module.exports = new GooglePhotosService();