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

  openGooglePhotosModal(currentPath) {
    console.log('🔧 [DEBUG] openGooglePhotosModal called with path:', currentPath);
    
    if (!this.isAuthenticated) {
      this.showError('Please connect to Google Photos first');
      return;
    }

    this.currentImportPath = currentPath;
    this.showGooglePhotosModal();
    this.createPickerSession();
  }

  showGooglePhotosModal() {
    const modal = document.getElementById('googlePhotosModal');
    if (modal) {
      modal.classList.remove('hidden');
      this.resetModalStates();
      document.getElementById('sessionLoadingState').classList.remove('hidden');
    }
  }

  hideGooglePhotosModal() {
    const modal = document.getElementById('googlePhotosModal');
    if (modal) {
      modal.classList.add('hidden');
      this.currentSessionUrl = null;
    }
  }

  resetModalStates() {
    document.getElementById('sessionLoadingState').classList.add('hidden');
    document.getElementById('sessionReadyState').classList.add('hidden');
    document.getElementById('sessionErrorState').classList.add('hidden');
  }

  async createPickerSession() {
    try {
      console.log('🔧 [DEBUG] Creating Google Photos picker session...');
      
      const response = await fetch('/api/admin/google-photos/picker-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          destinationPath: this.currentImportPath
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('🔧 [DEBUG] Session created successfully:', data);
        console.log('🔧 [DEBUG] Session ID from response:', data.sessionId);
        console.log('🔧 [DEBUG] Session URL from response:', data.sessionUrl);
        console.log('🔧 [DEBUG] Polling config from response:', data.pollingConfig);
        
        // Store session data with parsed polling config
        this.currentSessionData = {
          id: data.sessionId,
          url: data.sessionUrl,
          pollingConfig: this.parsePollingConfig(data.pollingConfig)
        };
        
        console.log('🔧 [DEBUG] Stored session data:', this.currentSessionData);
        
        this.currentSessionUrl = data.sessionUrl;
        this.showSessionReady();
      } else {
        console.error('❌ [DEBUG] Failed to create session:', data.error);
        this.showSessionError(data.error || 'Failed to create picker session');
      }
    } catch (error) {
      console.error('❌ [DEBUG] Error creating picker session:', error);
      this.showSessionError('Failed to create picker session');
    }
  }

  showSessionReady() {
    this.resetModalStates();
    document.getElementById('sessionReadyState').classList.remove('hidden');
  }

  showSessionError(errorMessage) {
    this.resetModalStates();
    document.getElementById('sessionErrorState').classList.remove('hidden');
    document.getElementById('sessionErrorMessage').textContent = errorMessage;
  }

  openPickerSession() {
    if (this.currentSessionUrl && this.currentSessionData) {
      // Open the picker in a new tab
      window.open(this.currentSessionUrl, '_blank');
      
      // Start polling and timer
      this.startSessionPolling();
      this.showPollingState();
    }
  }

  showPollingState() {
    this.resetModalStates();
    
    // Show polling state with timer
    const pollingState = document.createElement('div');
    pollingState.id = 'sessionPollingState';
    pollingState.className = 'session-state';
    pollingState.innerHTML = `
      <div class="session-icon">
        <span class="material-icons">access_time</span>
      </div>
      <p>Waiting for photo selection...</p>
      <div class="session-timer">
        <span id="sessionTimer">--:--</span>
      </div>
      <small>Select photos in the Google Photos tab and confirm your selection.</small>
    `;
    
    // Replace the ready state with polling state
    const readyState = document.getElementById('sessionReadyState');
    readyState.parentNode.insertBefore(pollingState, readyState);
    readyState.remove();
  }

  startSessionPolling() {
    const { pollInterval, timeoutIn } = this.currentSessionData.pollingConfig;
    
    console.log('🔧 [DEBUG] Starting session polling:', { pollInterval, timeoutIn });
    
    // Start timeout timer
    this.sessionStartTime = Date.now();
    this.sessionTimeoutMs = timeoutIn;
    this.startSessionTimer();
    
    // Start polling
    this.pollingInterval = setInterval(() => {
      this.pollSession();
    }, pollInterval);
    
    // Set overall timeout
    this.sessionTimeout = setTimeout(() => {
      this.handleSessionTimeout();
    }, timeoutIn);
  }

  startSessionTimer() {
    this.timerInterval = setInterval(() => {
      const elapsed = Date.now() - this.sessionStartTime;
      const remaining = Math.max(0, this.sessionTimeoutMs - elapsed);
      
      if (remaining === 0) {
        clearInterval(this.timerInterval);
        return;
      }
      
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      const timerElement = document.getElementById('sessionTimer');
      if (timerElement) {
        timerElement.textContent = timeString;
      }
    }, 1000);
  }

  async pollSession() {
    try {
      console.log('🔧 [DEBUG] Polling session:', this.currentSessionData.id);
      
      const response = await fetch(`/api/admin/google-photos/session/${this.currentSessionData.id}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log('🔧 [DEBUG] Session poll result:', data);
        
        if (data.mediaItemsSet && data.mediaItems && data.mediaItems.length > 0) {
          // User has selected photos
          this.handleSessionComplete(data.mediaItems);
        }
      } else {
        console.warn('⚠️ [DEBUG] Session poll failed:', data.error);
      }
    } catch (error) {
      console.error('❌ [DEBUG] Error polling session:', error);
    }
  }

  handleSessionComplete(mediaItems) {
    console.log('🔧 [DEBUG] Session completed with media items:', mediaItems);
    
    // Clear timers and intervals
    this.clearSessionTimers();
    
    // Show completion state
    this.showSessionComplete(mediaItems);
  }

  handleSessionTimeout() {
    console.log('🔧 [DEBUG] Session timed out');
    
    // Clear timers and intervals
    this.clearSessionTimers();
    
    // Close modal and show timeout message
    this.hideGooglePhotosModal();
    this.showMessage('Google Photos session timed out. Please try again.');
  }

  clearSessionTimers() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
      this.sessionTimeout = null;
    }
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  showSessionComplete(mediaItems) {
    this.resetModalStates();
    
    const completeState = document.createElement('div');
    completeState.id = 'sessionCompleteState';
    completeState.className = 'session-state';
    completeState.innerHTML = `
      <div class="session-icon">
        <span class="material-icons">check_circle</span>
      </div>
      <p>Photos selected successfully!</p>
      <small>${mediaItems.length} photo(s) ready to import</small>
      <button id="importSelectedBtn" class="btn-primary">
        <span class="material-icons">file_download</span>
        Import Selected Photos
      </button>
    `;
    
    // Add to modal content
    const modalContent = document.querySelector('.google-photos-content');
    modalContent.appendChild(completeState);
  }

  // Parse Google's duration strings (e.g., "5s", "300.5s") to milliseconds
  parsePollingConfig(pollingConfig) {
    console.log('🔧 [DEBUG] Frontend parsing polling config:', pollingConfig);
    
    if (!pollingConfig) {
      return {
        pollInterval: 5000,   // Default 5 seconds
        timeoutIn: 300000     // Default 5 minutes
      };
    }
    
    const parseDuration = (durationStr) => {
      // If already a number, return as is (backend already parsed)
      if (typeof durationStr === 'number') {
        return durationStr;
      }
      
      // If string, parse it
      if (typeof durationStr === 'string') {
        const match = durationStr.match(/^(\d+(?:\.\d+)?)s$/);
        if (match) {
          return Math.round(parseFloat(match[1]) * 1000); // Convert to milliseconds
        }
      }
      
      return null;
    };
    
    const pollInterval = parseDuration(pollingConfig.pollInterval) || 5000;   // Default 5 seconds
    const timeoutIn = parseDuration(pollingConfig.timeoutIn) || 300000;       // Default 5 minutes
    
    const result = { pollInterval, timeoutIn };
    console.log('🔧 [DEBUG] Frontend parsed polling config result:', result);
    
    return result;
  }

  hideGooglePhotosModal() {
    // Clear any timers when modal is closed
    this.clearSessionTimers();
    
    const modal = document.getElementById('googlePhotosModal');
    if (modal) {
      modal.classList.add('hidden');
      this.currentSessionUrl = null;
      this.currentSessionData = null;
      
      // Clean up any dynamically created states
      const pollingState = document.getElementById('sessionPollingState');
      const completeState = document.getElementById('sessionCompleteState');
      if (pollingState) pollingState.remove();
      if (completeState) completeState.remove();
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.googlePhotosSync = new GooglePhotosSync();
});