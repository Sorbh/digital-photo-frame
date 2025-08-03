console.log('🔧 [DEBUG] GooglePhotosSync.js file loaded successfully');

class GooglePhotosSync {
  constructor() {
    console.log('🔧 [DEBUG] GooglePhotosSync constructor called');
    this.isAuthenticated = false;
    this.userInfo = null;
    this.authenticationInProgress = false;
    this.justAuthenticated = false;
    this.callbackReceived = false; // Flag to prevent race condition with popup close detection
    this.init();
  }

  init() {
    this.checkAuthStatus('init');
    this.bindEvents();
    this.setupMessageListener();
  }

  bindEvents() {
    console.log('🔧 [DEBUG] bindEvents() called');
    const googlePhotosBtn = document.getElementById('googlePhotosBtn');
    if (googlePhotosBtn) {
      console.log('🔧 [DEBUG] Google Photos button found, adding click listener');
      googlePhotosBtn.addEventListener('click', () => {
        console.log('🔧 [DEBUG] Google Photos button clicked!');
        this.handleGooglePhotosAction();
      });
    } else {
      console.error('❌ [DEBUG] Google Photos button not found!');
    }
  }

  setupMessageListener() {
    // Listen for messages from OAuth popup
    window.addEventListener('message', async (event) => {
      if (event.data.type === 'google-photos-auth') {
        await this.handleAuthCallback(event.data);
      }
    });
  }

  async checkAuthStatus(caller = 'unknown') {
    try {
      console.log('checkAuthStatus called by:', caller, 'justAuthenticated:', this.justAuthenticated); // Debug log
      
      // If we just authenticated successfully, don't override the state for 5 seconds
      if (this.justAuthenticated && caller !== 'handleAuthCallback') {
        console.log('Skipping auth check - just authenticated successfully');
        return;
      }
      
      const response = await fetch('/api/admin/google-photos/status');
      const result = await response.json();
      
      console.log('Auth status check result:', result); // Debug log
      
      if (result.success) {
        this.isAuthenticated = result.data.authenticated;
        this.userInfo = result.data.userInfo;
        console.log('Updated auth state:', { authenticated: this.isAuthenticated, userInfo: this.userInfo }); // Debug log
        this.updateButtonState();
      }
    } catch (error) {
      console.error('Failed to check Google Photos auth status:', error);
    }
  }

  updateButtonState() {
    const googlePhotosBtn = document.getElementById('googlePhotosBtn');
    if (!googlePhotosBtn) return;

    console.log('Updating button state:', { authenticated: this.isAuthenticated, userInfo: this.userInfo, justAuthenticated: this.justAuthenticated }); // Debug log

    if (this.isAuthenticated && this.userInfo) {
      console.log('Setting authenticated state'); // Debug log
      googlePhotosBtn.title = `Connected to Google Photos (${this.userInfo.email})`;
      googlePhotosBtn.classList.add('authenticated');
      googlePhotosBtn.innerHTML = '<span class="material-icons">check_circle</span> Connected to Google Photos';
    } else if (!this.justAuthenticated) {
      // Only set to unauthenticated if we haven't just authenticated
      console.log('Setting unauthenticated state'); // Debug log
      googlePhotosBtn.title = 'Connect to Google Photos';
      googlePhotosBtn.classList.remove('authenticated');
      googlePhotosBtn.innerHTML = '<span class="material-icons">photo_library</span> Connect Google Photos';
    } else {
      console.log('Preserving button state - just authenticated'); // Debug log
    }
  }

  handleGooglePhotosAction() {
    if (!this.isAuthenticated) {
      this.startAuthentication();
    } else {
      this.showMessage('Successfully connected to Google Photos!');
    }
  }

  async startAuthentication() {
    try {
      console.log('🔧 [DEBUG] startAuthentication() called');
      this.authenticationInProgress = true; // Set flag to prevent race conditions
      this.callbackReceived = false; // Reset callback flag for new authentication attempt
      
      // Show loading state
      const googlePhotosBtn = document.getElementById('googlePhotosBtn');
      if (googlePhotosBtn) {
        googlePhotosBtn.disabled = true;
        googlePhotosBtn.innerHTML = '<span class="material-icons">hourglass_empty</span> Connecting...';
        console.log('🔧 [DEBUG] Button set to loading state');
      }

      const redirectUri = window.location.origin + '/api/admin/google-photos/callback';
      console.log('🔧 [DEBUG] Making auth request with redirectUri:', redirectUri);
      
      const response = await fetch('/api/admin/google-photos/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          redirectUri: redirectUri
        })
      });

      console.log('🔧 [DEBUG] Auth response status:', response.status);
      const result = await response.json();
      console.log('🔧 [DEBUG] Auth response result:', result);
      
      if (result.success) {
        console.log('🔧 [DEBUG] Opening OAuth popup with URL:', result.data.authUrl);
        
        // Open OAuth popup
        this.authPopup = window.open(
          result.data.authUrl,
          'googlePhotosAuth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        // Focus the popup
        if (this.authPopup) {
          this.authPopup.focus();
          console.log('🔧 [DEBUG] Popup opened and focused successfully');
        } else {
          console.error('❌ [DEBUG] Failed to open popup - popup blocker?');
        }

        // Listen for popup close without success message
        const checkClosed = setInterval(async () => {
          if (this.authPopup && this.authPopup.closed) {
            clearInterval(checkClosed);
            // Only trigger cancellation if no callback was received
            if (!this.callbackReceived) {
              console.log('🔧 [DEBUG] Popup closed without callback - assuming user cancelled');
              await this.handleAuthCallback({ success: false, error: 'Authentication cancelled by user' });
            } else {
              console.log('🔧 [DEBUG] Popup closed after successful callback');
            }
          }
        }, 1000);
      } else {
        console.error('❌ [DEBUG] Auth request failed:', result.error);
        this.showError('Failed to start authentication: ' + result.error.message);
        this.resetButtonState();
        this.authenticationInProgress = false;
      }
    } catch (error) {
      console.error('❌ [DEBUG] Authentication error:', error);
      this.showError('Failed to start Google Photos authentication');
      this.resetButtonState();
      this.authenticationInProgress = false;
    }
  }

  async handleAuthCallback(data) {
    console.log('🔧 [DEBUG] handleAuthCallback called with data:', data);
    
    // Set flag to prevent race condition
    this.callbackReceived = true;
    
    if (this.authPopup && !this.authPopup.closed) {
      this.authPopup.close();
      console.log('🔧 [DEBUG] Popup closed');
    }

    if (data.success) {
      console.log('🔧 [DEBUG] Authentication successful');
      this.isAuthenticated = true;
      this.justAuthenticated = true;
      
      // Set a timer to clear the justAuthenticated flag after 5 seconds
      setTimeout(() => {
        this.justAuthenticated = false;
        console.log('Cleared justAuthenticated flag');
      }, 5000);
      
      // Fetch fresh user info before updating button state
      await this.checkAuthStatus('handleAuthCallback');
      this.showMessage('Successfully connected to Google Photos!');
    } else {
      this.isAuthenticated = false;
      this.userInfo = null;
      this.justAuthenticated = false;
      this.resetButtonState();
      if (data.error !== 'Authentication cancelled by user') {
        this.showError(data.error || 'Authentication failed');
      }
    }
    
    // Clear authentication in progress flag
    this.authenticationInProgress = false;
  }


  resetButtonState() {
    const googlePhotosBtn = document.getElementById('googlePhotosBtn');
    if (googlePhotosBtn) {
      googlePhotosBtn.disabled = false;
      this.updateButtonState();
    }
  }

  async logout() {
    try {
      const response = await fetch('/api/admin/google-photos/auth', {
        method: 'DELETE'
      });

      const result = await response.json();
      
      if (result.success) {
        this.isAuthenticated = false;
        this.userInfo = null;
        this.updateButtonState();
        this.showMessage('Disconnected from Google Photos');
      } else {
        this.showError('Failed to disconnect: ' + result.error.message);
      }
    } catch (error) {
      console.error('Logout error:', error);
      this.showError('Failed to disconnect from Google Photos');
    }
  }

  showError(message) {
    // Use existing toast system if available, otherwise console log
    if (window.showToast) {
      window.showToast(message, 'error');
    } else {
      console.error('Google Photos Error:', message);
    }
  }

  showMessage(message) {
    // Use existing toast system if available, otherwise console log
    if (window.showToast) {
      window.showToast(message, 'info');
    } else {
      console.log('Google Photos Message:', message);
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.googlePhotosSync = new GooglePhotosSync();
});