class GooglePhotosSync {
  constructor() {
    this.isAuthenticated = false;
    this.userInfo = null;
    this.dataService = new GooglePhotosDataService();
    this.selectionManager = new SelectionManager();
    this.albumBrowser = null;
    this.photoBrowser = null;
    this.currentView = 'albums'; // 'albums' or 'photos'
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
    // Create and show the full sync interface with browsers
    this.showFullSyncInterface();
  }

  showFullSyncInterface() {
    // Create full sync interface modal
    const modal = document.createElement('div');
    modal.className = 'modal google-photos-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="google-photos-header">
          <span class="material-icons">photo_library</span>
          <h2>Google Photos Sync</h2>
          <button id="closeBtn" class="btn-icon" title="Close">
            <span class="material-icons">close</span>
          </button>
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

        <div class="sync-interface">
          <div class="view-tabs">
            <button id="albumsTab" class="tab-button active">
              <span class="material-icons">photo_album</span>
              Albums
            </button>
            <button id="photosTab" class="tab-button">
              <span class="material-icons">photo</span>
              Photos
            </button>
          </div>

          <div class="selection-summary" id="selectionSummary">
            <div class="selection-summary-content">
              <div class="selection-stats" id="selectionStats">
                <!-- Selection stats will be populated here -->
              </div>
              <div class="selection-actions">
                <button id="clearSelectionBtn" class="btn-secondary">
                  <span class="material-icons">clear_all</span>
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div class="browser-container">
            <div id="albumBrowserContainer" class="browser-view active">
              <!-- Album browser will be rendered here -->
            </div>
            <div id="photoBrowserContainer" class="browser-view">
              <!-- Photo browser will be rendered here -->
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button id="cancelBtn" class="btn-secondary">Cancel</button>
          <button id="syncBtn" class="btn-primary" disabled>
            <span class="material-icons">sync</span>
            Start Sync
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.classList.remove('hidden');

    // Initialize browsers
    this.initializeBrowsers(modal);

    // Bind events
    this.bindSyncInterfaceEvents(modal);
  }

  initializeBrowsers(modal) {
    // Initialize album browser
    this.albumBrowser = new AlbumBrowser(this.dataService, this.selectionManager);
    const albumContainer = modal.querySelector('#albumBrowserContainer');
    this.albumBrowser.render(albumContainer);

    // Initialize photo browser
    this.photoBrowser = new PhotoBrowser(this.dataService, this.selectionManager);
    const photoContainer = modal.querySelector('#photoBrowserContainer');
    this.photoBrowser.render(photoContainer);

    // Set up selection manager callbacks
    this.selectionManager.addChangeCallback((summary) => {
      this.updateSelectionSummary(summary);
    });

    // Set up browser communication
    document.addEventListener('backToAlbums', () => {
      this.switchToView('albums');
    });
  }

  bindSyncInterfaceEvents(modal) {
    // Tab switching
    const albumsTab = modal.querySelector('#albumsTab');
    const photosTab = modal.querySelector('#photosTab');

    albumsTab.addEventListener('click', () => {
      this.switchToView('albums');
    });

    photosTab.addEventListener('click', () => {
      this.switchToView('photos');
    });

    // Action buttons
    const logoutBtn = modal.querySelector('#logoutBtn');
    const closeBtn = modal.querySelector('#closeBtn');
    const cancelBtn = modal.querySelector('#cancelBtn');
    const clearBtn = modal.querySelector('#clearSelectionBtn');
    const syncBtn = modal.querySelector('#syncBtn');

    logoutBtn.addEventListener('click', async () => {
      await this.logout();
      document.body.removeChild(modal);
    });

    closeBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    clearBtn.addEventListener('click', () => {
      this.selectionManager.clearAll();
    });

    syncBtn.addEventListener('click', () => {
      this.startSync(modal);
    });

    // Close on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  switchToView(view) {
    this.currentView = view;
    
    // Update tabs
    const albumsTab = document.getElementById('albumsTab');
    const photosTab = document.getElementById('photosTab');
    const albumContainer = document.getElementById('albumBrowserContainer');
    const photoContainer = document.getElementById('photoBrowserContainer');

    if (view === 'albums') {
      albumsTab.classList.add('active');
      photosTab.classList.remove('active');
      albumContainer.classList.add('active');
      photoContainer.classList.remove('active');
    } else {
      albumsTab.classList.remove('active');
      photosTab.classList.add('active');
      albumContainer.classList.remove('active');
      photoContainer.classList.add('active');
    }
  }

  updateSelectionSummary(summary) {
    const summaryEl = document.getElementById('selectionSummary');
    const statsEl = document.getElementById('selectionStats');
    const syncBtn = document.getElementById('syncBtn');

    if (summary.hasSelection) {
      summaryEl.classList.add('has-selection');
      
      statsEl.innerHTML = `
        ${summary.albumCount > 0 ? `
          <div class="selection-stat">
            <span class="material-icons">photo_album</span>
            <span>${summary.albumCount} album${summary.albumCount !== 1 ? 's' : ''}</span>
          </div>
        ` : ''}
        ${summary.photoCount > 0 ? `
          <div class="selection-stat">
            <span class="material-icons">photo</span>
            <span>${summary.photoCount} photo${summary.photoCount !== 1 ? 's' : ''}</span>
          </div>
        ` : ''}
        <div class="selection-stat">
          <span class="material-icons">check_circle</span>
          <span>${summary.totalItems} total</span>
        </div>
      `;

      if (syncBtn) syncBtn.disabled = false;
    } else {
      summaryEl.classList.remove('has-selection');
      if (syncBtn) syncBtn.disabled = true;
    }
  }

  async startSync(modal) {
    const validation = this.selectionManager.validateSelection();
    
    if (!validation.isValid) {
      this.showError(validation.errors.join(', '));
      return;
    }

    // For now, show the sync payload (will be implemented in next task)
    const payload = this.selectionManager.generateSyncPayload();
    console.log('Sync payload:', payload);
    
    this.showMessage(`Sync will be implemented in the next task. Selected: ${payload.albums.length} albums, ${payload.individualPhotos.length} individual photos`);
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