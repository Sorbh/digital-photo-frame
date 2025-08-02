const crypto = require('crypto');

class OAuthManager {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.secretKey = this.getEncryptionKey();
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
      const cipher = crypto.createCipher('aes-256-cbc', this.secretKey);
      
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
      const decipher = crypto.createDecipher('aes-256-cbc', this.secretKey);
      
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
}

module.exports = new OAuthManager();