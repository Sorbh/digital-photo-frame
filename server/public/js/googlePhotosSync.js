class GooglePhotosSync {
  constructor() {
    this.isAuthenticated = false;
    this.userInfo = null;
    this.init();
  }

  init() {
    this.checkAuthStatus();
    this.bindEvents();
    this.setupMessageListener();
  }

  bindEvents() {
    const googlePhotosBtn = document.getElementById('googlePhotosBtn');
    if (googlePhotosBtn) {
      googlePhotosBtn.addEventListener('click', () => this.handleGooglePhotosAction());
    }
  }

  setupMessageListener() {
    // Listen for messages from OAuth popup
    window.addEventListener('message', (event) => {
      if (event.data.type === 'google-photos-auth') {
        this.handleAuthCallback(event.data);
      }
    });
  }

  async checkAuthStatus() {
    try {
      const response = await fetch('/api/admin/google-photos/status');
      const result = await response.json();
      
      if (result.success) {
        this.isAuthenticated = result.data.authenticated;
        this.userInfo = result.data.userInfo;
        this.updateButtonState();
      }
    } catch (error) {
      console.error('Failed to check Google Photos auth status:', error);
    }
  }

  updateButtonState() {
    const googlePhotosBtn = document.getElementById('googlePhotosBtn');
    if (!googlePhotosBtn) return;

    if (this.isAuthenticated && this.userInfo) {
      googlePhotosBtn.title = `Open Google Photos (${this.userInfo.email})`;
      googlePhotosBtn.classList.add('authenticated');
      googlePhotosBtn.innerHTML = '<span class="material-icons">photo_library</span> Open Google Photos';
    } else {
      googlePhotosBtn.title = 'Connect to Google Photos';
      googlePhotosBtn.classList.remove('authenticated');
      googlePhotosBtn.innerHTML = '<span class="material-icons">photo_library</span> Connect Google Photos';
    }
  }

  handleGooglePhotosAction() {
    if (!this.isAuthenticated) {
      this.startAuthentication();
    } else {
      this.openGooglePhotos();
    }
  }

  async startAuthentication() {
    try {
      // Show loading state
      const googlePhotosBtn = document.getElementById('googlePhotosBtn');
      if (googlePhotosBtn) {
        googlePhotosBtn.disabled = true;
        googlePhotosBtn.innerHTML = '<span class="material-icons">hourglass_empty</span> Connecting...';
      }

      const response = await fetch('/api/admin/google-photos/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          redirectUri: window.location.origin + '/api/admin/google-photos/callback'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Open OAuth popup
        this.authPopup = window.open(
          result.data.authUrl,
          'googlePhotosAuth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        // Focus the popup
        if (this.authPopup) {
          this.authPopup.focus();
        }

        // Listen for popup close without success message
        const checkClosed = setInterval(() => {
          if (this.authPopup && this.authPopup.closed) {
            clearInterval(checkClosed);
            // If popup closed without success, assume user cancelled
            this.handleAuthCallback({ success: false, error: 'Authentication cancelled by user' });
          }
        }, 1000);
      } else {
        this.showError('Failed to start authentication: ' + result.error.message);
        this.resetButtonState();
      }
    } catch (error) {
      console.error('Authentication error:', error);
      this.showError('Failed to start Google Photos authentication');
      this.resetButtonState();
    }
  }

  handleAuthCallback(data) {
    // Reset button state
    this.resetButtonState();
    
    if (this.authPopup && !this.authPopup.closed) {
      this.authPopup.close();
    }

    if (data.success) {
      this.isAuthenticated = true;
      this.checkAuthStatus(); // Refresh user info
      this.showMessage('Successfully connected to Google Photos! You can now access your photos.');
      
      // Automatically open Google Photos after successful authentication
      setTimeout(() => {
        this.openGooglePhotos();
      }, 1500);
    } else {
      this.isAuthenticated = false;
      this.userInfo = null;
      this.updateButtonState();
      if (data.error !== 'Authentication cancelled by user') {
        this.showError(data.error || 'Authentication failed');
      }
    }
  }

  async openGooglePhotos() {
    try {
      // Show loading state
      const googlePhotosBtn = document.getElementById('googlePhotosBtn');
      if (googlePhotosBtn) {
        googlePhotosBtn.disabled = true;
        googlePhotosBtn.innerHTML = '<span class="material-icons">hourglass_empty</span> Opening Picker...';
      }

      // Create Google Photos Picker session
      const response = await fetch('/api/admin/google-photos/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (result.success) {
        // Open Google Photos Picker in new tab
        const pickerTab = window.open(
          result.data.pickerUrl,
          'googlePhotosPicker',
          'width=1024,height=768,scrollbars=yes,resizable=yes'
        );

        if (pickerTab) {
          pickerTab.focus();
          this.showMessage('Google Photos Picker opened. Select your photos and they will be available for download.');
          
          // Store session info for potential cleanup
          this.currentPickerSession = {
            sessionId: result.data.sessionId,
            requestId: result.data.requestId
          };
        } else {
          // Fallback - provide direct link
          this.showGooglePhotosLinkModal(result.data.pickerUrl, true);
        }
      } else {
        // Handle specific error cases
        if (result.error.code === 'NO_GOOGLE_PHOTOS_ACCOUNT') {
          this.showError('You need an active Google Photos account to use the picker. Please set up Google Photos first.');
        } else if (result.error.code === 'TOO_MANY_SESSIONS') {
          this.showError('Too many picker sessions are active. Please try again in a few minutes.');
        } else {
          this.showError('Failed to create Google Photos picker session: ' + result.error.message);
        }
      }
    } catch (error) {
      console.error('Failed to open Google Photos Picker:', error);
      this.showError('Failed to open Google Photos Picker');
    } finally {
      // Reset button state
      this.resetButtonState();
    }
  }

  showGooglePhotosLinkModal(url, isPicker = false) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 500px; text-align: center;">
        <div class="modal-header">
          <span class="material-icons">${isPicker ? 'photo_camera' : 'photo_library'}</span>
          <h2>Open Google Photos ${isPicker ? 'Picker' : ''}</h2>
          <button class="btn-icon close-modal" title="Close">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="modal-body">
          <p>Click the button below to open ${isPicker ? 'Google Photos Picker' : 'Google Photos'} in a new tab:</p>
          <div style="margin: 20px 0;">
            <a href="${url}" target="_blank" class="btn-primary" style="display: inline-flex; align-items: center; gap: 8px; text-decoration: none;">
              <span class="material-icons">open_in_new</span>
              Open ${isPicker ? 'Photos Picker' : 'Google Photos'}
            </a>
          </div>
          <p style="font-size: 14px; color: #666;">
            ${isPicker 
              ? 'Use the picker to select photos, then they will be available for download in your applications.'
              : 'From Google Photos, you can view, organize, and download your photos.'
            }
          </p>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary close-modal">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Bind close events
    const closeButtons = modal.querySelectorAll('.close-modal');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        document.body.removeChild(modal);
      });
    });

    // Close on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
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