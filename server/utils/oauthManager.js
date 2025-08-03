const crypto = require('crypto');
const { google } = require('googleapis');

class OAuthManager {
  constructor() {
    console.log('🔧 [DEBUG] OAuthManager constructor started');
    console.log('🔧 [DEBUG] Environment variables check:');
    console.log('🔧 [DEBUG] GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'MISSING');
    console.log('🔧 [DEBUG] GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING');
    console.log('🔧 [DEBUG] GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI ? 'SET' : 'MISSING');
    console.log('🔧 [DEBUG] SESSION_SECRET:', process.env.SESSION_SECRET ? 'SET' : 'MISSING');
    
    this.algorithm = 'aes-256-gcm';
    
    try {
      this.secretKey = this.getEncryptionKey();
      console.log('🔧 [DEBUG] Encryption key generated successfully');
    } catch (error) {
      console.error('❌ [DEBUG] Failed to generate encryption key:', error.message);
      throw error;
    }
    
    try {
      this.oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      console.log('🔧 [DEBUG] OAuth2 client created successfully');
    } catch (error) {
      console.error('❌ [DEBUG] Failed to create OAuth2 client:', error.message);
      throw error;
    }
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
    console.log('🔧 [DEBUG] getAuthUrl called with redirectUri:', redirectUri);
    
    const scopes = [
      'https://www.googleapis.com/auth/photospicker.mediaitems.readonly',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ];
    
    console.log('🔧 [DEBUG] OAuth scopes:', scopes);

    try {
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        include_granted_scopes: true
      });
      console.log('🔧 [DEBUG] Generated auth URL:', authUrl);
      return authUrl;
    } catch (error) {
      console.error('❌ [DEBUG] Failed to generate auth URL:', error.message);
      throw error;
    }
  }

  async exchangeCodeForTokens(code) {
    console.log('🔧 [DEBUG] exchangeCodeForTokens called with code:', code ? 'PROVIDED' : 'MISSING');
    
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      console.log('🔧 [DEBUG] Token exchange successful. Tokens received:', {
        access_token: tokens.access_token ? 'SET' : 'MISSING',
        refresh_token: tokens.refresh_token ? 'SET' : 'MISSING',
        expiry_date: tokens.expiry_date || 'NOT_SET'
      });
      
      // Fetch user profile information
      try {
        this.oauth2Client.setCredentials(tokens);
        const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        console.log('🔧 [DEBUG] User profile fetched:', userInfo.data);
        
        // Add user info to tokens
        tokens.userEmail = userInfo.data.email;
        tokens.userName = userInfo.data.name;
        tokens.userPicture = userInfo.data.picture;
        
        console.log('🔧 [DEBUG] Enhanced tokens with user info:', {
          email: tokens.userEmail,
          name: tokens.userName
        });
      } catch (profileError) {
        console.error('❌ [DEBUG] Failed to fetch user profile:', profileError.message);
        // Continue without user info
      }
      
      return tokens;
    } catch (error) {
      console.error('❌ [DEBUG] Token exchange failed:', error.message);
      console.error('❌ [DEBUG] Full error:', error);
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