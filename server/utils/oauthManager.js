const crypto = require('crypto');
const { google } = require('googleapis');

class OAuthManager {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.secretKey = this.getEncryptionKey();
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  getEncryptionKey() {
    const sessionSecret = process.env.SESSION_SECRET;
    if (!sessionSecret) {
      throw new Error('SESSION_SECRET required for token encryption');
    }

    // Create a 32-byte key from the session secret
    return crypto.scryptSync(sessionSecret, 'google-photos-salt', 32);
  }

  encrypt(text) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', this.secretKey, iv);

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return {
        iv: iv.toString('hex'),
        encryptedData: encrypted
      };
    } catch (error) {
      console.error('Token encryption failed:', error.message);
      throw new Error('Failed to encrypt tokens');
    }
  }

  decrypt(encryptedObj) {
    try {
      const iv = Buffer.from(encryptedObj.iv, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', this.secretKey, iv);

      let decrypted = decipher.update(encryptedObj.encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Token decryption failed:', error.message);
      return null;
    }
  }

  generateState() {
    return crypto.randomBytes(32).toString('hex');
  }

  async storeTokens(session, tokens) {
    try {
      const tokenString = JSON.stringify(tokens);
      const encrypted = this.encrypt(tokenString);

      session.googlePhotosTokens = encrypted;
      session.googlePhotosAuth = true;

      return true;
    } catch (error) {
      console.error('Failed to store tokens:', error.message);
      throw new Error('Failed to store authentication tokens');
    }
  }

  getTokens(session) {
    if (!session.googlePhotosTokens || !session.googlePhotosAuth) {
      return null;
    }

    try {
      const decrypted = this.decrypt(session.googlePhotosTokens);
      if (!decrypted) {
        return null;
      }

      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to retrieve tokens:', error.message);
      return null;
    }
  }

  clearTokens(session) {
    delete session.googlePhotosTokens;
    delete session.googlePhotosAuth;
  }

  isTokenExpired(tokens) {
    if (!tokens || !tokens.expiry_date) {
      return true;
    }

    // Add 5 minute buffer
    const bufferTime = 5 * 60 * 1000;
    return Date.now() >= (tokens.expiry_date - bufferTime);
  }

  // OAuth flow methods
  getAuthUrl(redirectUri) {
    const scopes = [
      'https://www.googleapis.com/auth/photospicker.mediaitems.readonly',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      include_granted_scopes: true
    });
  }

  async exchangeCodeForTokens(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      return tokens;
    } catch (error) {
      console.error('Token exchange failed:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  async revokeTokens(accessToken) {
    try {
      await this.oauth2Client.revokeToken(accessToken);
      return true;
    } catch (error) {
      console.error('Token revocation failed:', error);
      throw new Error('Failed to revoke tokens');
    }
  }

  // Alias methods for controller compatibility
  getStoredTokens(session) {
    return this.getTokens(session);
  }

  async storeStoredTokens(session, tokens) {
    return this.storeTokens(session, tokens);
  }

  clearStoredTokens(session) {
    return this.clearTokens(session);
  }
}

module.exports = new OAuthManager();