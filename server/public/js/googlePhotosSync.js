class GooglePhotosSync {
  constructor() {
    this.isAuthenticated = false;
    this.userInfo = null;
    this.init();
  }

  init() {
    this.checkAuthStatus();
    this.bindEvents();
  }

  bindEvents() {
    const googlePhotosBtn = document.getElementById('googlePhotosBtn');
    if (googlePhotosBtn) {
      googlePhotosBtn.addEventListener('click', () => this.openSyncInterface());
    }
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
      googlePhotosBtn.title = `Sync Google Photos (${this.userInfo.email})`;
      googlePhotosBtn.classList.add('authenticated');
    } else {
      googlePhotosBtn.title = 'Sync Google Photos';
      googlePhotosBtn.classList.remove('authenticated');
    }
  }

  openSyncInterface() {
    if (!this.isAuthenticated) {
      this.startAuthentication();
    } else {
      this.showSyncInterface();
    }
  }

  async startAuthentication() {
    try {
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
        const popup = window.open(
          result.data.authUrl,
          'googlePhotosAuth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        // Listen for popup close
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            this.checkAuthStatus(); // Refresh auth status
          }
        }, 1000);
      } else {
        this.showError('Failed to start authentication: ' + result.error.message);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      this.showError('Failed to start Google Photos authentication');
    }
  }

  showSyncInterface() {
    // Placeholder for sync interface
    this.showMessage('Google Photos sync interface will be implemented in the next task');
  }

  showError(message) {
    // Use existing toast system if available, otherwise alert
    if (window.showToast) {
      window.showToast(message, 'error');
    } else {
      alert('Error: ' + message);
    }
  }

  showMessage(message) {
    // Use existing toast system if available, otherwise alert
    if (window.showToast) {
      window.showToast(message, 'info');
    } else {
      alert(message);
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.googlePhotosSync = new GooglePhotosSync();
});