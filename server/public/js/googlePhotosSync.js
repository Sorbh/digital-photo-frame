class GooglePhotosSync {
  constructor() {
    this.isAuthenticated = false;
    this.userInfo = null;
    this.dataService = new GooglePhotosDataService();
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
      googlePhotosBtn.addEventListener('click', () => this.openSyncInterface());
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
      this.userInfo = data.data.userInfo;
      this.updateButtonState();
      this.showMessage(`Successfully connected to Google Photos as ${this.userInfo.email}`);
    } else {
      this.isAuthenticated = false;
      this.userInfo = null;
      this.updateButtonState();
      this.showError(data.error || 'Authentication failed');
    }
  }

  resetButtonState() {
    const googlePhotosBtn = document.getElementById('googlePhotosBtn');
    if (googlePhotosBtn) {
      googlePhotosBtn.disabled = false;
      googlePhotosBtn.innerHTML = '<span class="material-icons">photo_library</span> Google Photos';
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

  showSyncInterface() {
    // Create and show a basic authenticated interface
    this.showAuthenticatedInterface();
  }

  showAuthenticatedInterface() {
    // Create modal for authenticated interface
    const modal = document.createElement('div');
    modal.className = 'modal google-photos-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="google-photos-header">
          <span class="material-icons">photo_library</span>
          <h2>Google Photos Sync</h2>
        </div>
        
        <div class="user-info">
          <span class="material-icons">account_circle</span>
          <div class="user-info-text">
            <div class="user-name">${this.userInfo.name}</div>
            <div class="user-email">${this.userInfo.email}</div>
          </div>
          <button id="logoutBtn" class="btn-secondary">
            <span class="material-icons">logout</span>
            Disconnect
          </button>
        </div>

        <div class="auth-section">
          <span class="material-icons">check_circle</span>
          <h3>Connected Successfully!</h3>
          <p>You can now browse your Google Photos albums and library.</p>
          
          <div class="test-actions" style="margin-top: 20px;">
            <button id="testAlbumsBtn" class="btn-secondary">
              <span class="material-icons">photo_album</span>
              Test Albums
            </button>
            <button id="testPhotosBtn" class="btn-secondary">
              <span class="material-icons">photo</span>
              Test Photos
            </button>
          </div>
          
          <div id="testResults" style="margin-top: 20px; max-height: 200px; overflow-y: auto; display: none;">
            <h4>Test Results:</h4>
            <pre id="testOutput" style="background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px;"></pre>
          </div>
        </div>

        <div class="modal-actions">
          <button id="closeModalBtn" class="btn-primary">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.classList.remove('hidden');

    // Bind events
    const logoutBtn = modal.querySelector('#logoutBtn');
    const closeModalBtn = modal.querySelector('#closeModalBtn');
    const testAlbumsBtn = modal.querySelector('#testAlbumsBtn');
    const testPhotosBtn = modal.querySelector('#testPhotosBtn');

    logoutBtn.addEventListener('click', async () => {
      await this.logout();
      document.body.removeChild(modal);
    });

    closeModalBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    testAlbumsBtn.addEventListener('click', () => {
      this.testAlbumsRetrieval(modal);
    });

    testPhotosBtn.addEventListener('click', () => {
      this.testPhotosRetrieval(modal);
    });

    // Close on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  async testAlbumsRetrieval(modal) {
    const testResults = modal.querySelector('#testResults');
    const testOutput = modal.querySelector('#testOutput');
    const testAlbumsBtn = modal.querySelector('#testAlbumsBtn');
    
    try {
      testAlbumsBtn.disabled = true;
      testAlbumsBtn.innerHTML = '<span class="material-icons">hourglass_empty</span> Loading...';
      
      testResults.style.display = 'block';
      testOutput.textContent = 'Fetching albums...';

      const result = await this.dataService.getAlbums(10); // Get first 10 albums
      
      const output = {
        albumCount: result.albums.length,
        hasNextPage: !!result.nextPageToken,
        albums: result.albums.map(album => ({
          id: album.id,
          title: album.title,
          mediaItemsCount: album.mediaItemsCount
        }))
      };

      testOutput.textContent = JSON.stringify(output, null, 2);
      this.showMessage(`Successfully retrieved ${result.albums.length} albums`);
    } catch (error) {
      testOutput.textContent = `Error: ${error.message}`;
      this.showError(`Failed to retrieve albums: ${error.message}`);
    } finally {
      testAlbumsBtn.disabled = false;
      testAlbumsBtn.innerHTML = '<span class="material-icons">photo_album</span> Test Albums';
    }
  }

  async testPhotosRetrieval(modal) {
    const testResults = modal.querySelector('#testResults');
    const testOutput = modal.querySelector('#testOutput');
    const testPhotosBtn = modal.querySelector('#testPhotosBtn');
    
    try {
      testPhotosBtn.disabled = true;
      testPhotosBtn.innerHTML = '<span class="material-icons">hourglass_empty</span> Loading...';
      
      testResults.style.display = 'block';
      testOutput.textContent = 'Fetching library photos...';

      const result = await this.dataService.getLibraryPhotos(10); // Get first 10 photos
      
      const output = {
        photoCount: result.mediaItems.length,
        hasNextPage: !!result.nextPageToken,
        photos: result.mediaItems.map(photo => ({
          id: photo.id,
          filename: photo.filename,
          mimeType: photo.mimeType,
          dimensions: `${photo.mediaMetadata.width}x${photo.mediaMetadata.height}`
        }))
      };

      testOutput.textContent = JSON.stringify(output, null, 2);
      this.showMessage(`Successfully retrieved ${result.mediaItems.length} photos`);
    } catch (error) {
      testOutput.textContent = `Error: ${error.message}`;
      this.showError(`Failed to retrieve photos: ${error.message}`);
    } finally {
      testPhotosBtn.disabled = false;
      testPhotosBtn.innerHTML = '<span class="material-icons">photo</span> Test Photos';
    }
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