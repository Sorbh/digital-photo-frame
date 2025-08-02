class PhotoBrowser {
  constructor(dataService, selectionManager) {
    this.dataService = dataService;
    this.selectionManager = selectionManager;
    this.photos = [];
    this.currentAlbum = null;
    this.currentPageToken = null;
    this.loading = false;
    this.hasMore = true;
    this.searchTerm = '';
    this.pageSize = 50;
    this.viewMode = 'library'; // 'library' or 'album'
  }

  render(container) {
    container.innerHTML = `
      <div class="browser-section">
        <div class="browser-header">
          <div class="browser-title">
            <h3 id="photosTitle">Select Photos</h3>
            <button id="backToAlbums" class="btn-icon" style="display: none;" title="Back to Albums">
              <span class="material-icons">arrow_back</span>
            </button>
          </div>
          <div class="browser-controls">
            <div class="search-box">
              <span class="material-icons">search</span>
              <input type="text" id="photoSearch" placeholder="Search photos..." />
            </div>
            <div class="view-toggle">
              <button id="libraryViewBtn" class="btn-secondary active">
                <span class="material-icons">photo_library</span>
                Library
              </button>
              <button id="albumViewBtn" class="btn-secondary">
                <span class="material-icons">photo_album</span>
                Albums
              </button>
            </div>
            <button id="selectAllPhotos" class="btn-secondary">
              <span class="material-icons">select_all</span>
              Select All
            </button>
          </div>
        </div>
        
        <div class="browser-grid" id="photoGrid">
          <!-- Photos will be loaded here -->
        </div>
        
        <div class="browser-loading" id="photoLoading" style="display: none;">
          <span class="material-icons">hourglass_empty</span>
          <span>Loading photos...</span>
        </div>
        
        <div class="browser-load-more" id="photoLoadMore" style="display: none;">
          <button class="btn-secondary">Load More Photos</button>
        </div>
        
        <div class="browser-empty" id="photoEmpty" style="display: none;">
          <span class="material-icons">photo</span>
          <p>No photos found</p>
        </div>
      </div>
    `;

    this.bindEvents(container);
    this.loadLibraryPhotos();
  }

  bindEvents(container) {
    // Search functionality
    const searchInput = container.querySelector('#photoSearch');
    searchInput.addEventListener('input', (e) => {
      this.searchTerm = e.target.value.toLowerCase();
      this.filterDisplayedPhotos();
    });

    // View toggle
    const libraryBtn = container.querySelector('#libraryViewBtn');
    const albumBtn = container.querySelector('#albumViewBtn');
    
    libraryBtn.addEventListener('click', () => {
      this.switchToLibraryView();
    });
    
    albumBtn.addEventListener('click', () => {
      this.switchToAlbumView();
    });

    // Select all photos
    const selectAllBtn = container.querySelector('#selectAllPhotos');
    selectAllBtn.addEventListener('click', () => {
      this.selectAllVisiblePhotos();
    });

    // Back to albums
    const backBtn = container.querySelector('#backToAlbums');
    backBtn.addEventListener('click', () => {
      this.goBackToAlbums();
    });

    // Load more button
    const loadMoreBtn = container.querySelector('#photoLoadMore button');
    loadMoreBtn.addEventListener('click', () => {
      this.loadMorePhotos();
    });

    // Listen for album opened events
    document.addEventListener('albumOpened', (e) => {
      this.openAlbum(e.detail.album);
    });
  }

  async switchToLibraryView() {
    this.viewMode = 'library';
    this.currentAlbum = null;
    this.updateViewButtons();
    this.updateTitle();
    await this.loadLibraryPhotos();
  }

  async switchToAlbumView() {
    this.viewMode = 'album';
    this.updateViewButtons();
    this.updateTitle();
    // Don't load anything yet - wait for album selection
    this.clearPhotos();
  }

  updateViewButtons() {
    const libraryBtn = document.getElementById('libraryViewBtn');
    const albumBtn = document.getElementById('albumViewBtn');
    const backBtn = document.getElementById('backToAlbums');
    
    if (this.viewMode === 'library') {
      libraryBtn.classList.add('active');
      albumBtn.classList.remove('active');
      backBtn.style.display = 'none';
    } else {
      libraryBtn.classList.remove('active');
      albumBtn.classList.add('active');
      backBtn.style.display = this.currentAlbum ? 'inline-flex' : 'none';
    }
  }

  updateTitle() {
    const titleEl = document.getElementById('photosTitle');
    if (this.currentAlbum) {
      titleEl.textContent = `Photos in "${this.currentAlbum.title}"`;
    } else if (this.viewMode === 'album') {
      titleEl.textContent = 'Select an Album';
    } else {
      titleEl.textContent = 'Select Photos from Library';
    }
  }

  async openAlbum(album) {
    this.currentAlbum = album;
    this.viewMode = 'album';
    this.updateViewButtons();
    this.updateTitle();
    await this.loadAlbumPhotos(album.id);
  }

  goBackToAlbums() {
    this.currentAlbum = null;
    this.updateTitle();
    this.updateViewButtons();
    this.clearPhotos();
    
    // Trigger back to albums event
    const event = new CustomEvent('backToAlbums');
    document.dispatchEvent(event);
  }

  async loadLibraryPhotos(reset = true) {
    if (this.loading) return;

    await this.loadPhotos(() => 
      this.dataService.getLibraryPhotos(this.pageSize, this.currentPageToken), 
      reset
    );
  }

  async loadAlbumPhotos(albumId, reset = true) {
    if (this.loading) return;

    await this.loadPhotos(() => 
      this.dataService.getAlbumPhotos(albumId, this.pageSize, this.currentPageToken), 
      reset
    );
  }

  async loadPhotos(fetchFunction, reset = true) {
    this.loading = true;
    const loadingEl = document.getElementById('photoLoading');
    const gridEl = document.getElementById('photoGrid');
    
    if (reset) {
      this.photos = [];
      this.currentPageToken = null;
      this.hasMore = true;
      gridEl.innerHTML = '';
    }

    loadingEl.style.display = 'flex';

    try {
      const result = await fetchFunction();
      
      this.photos.push(...result.mediaItems);
      this.currentPageToken = result.nextPageToken;
      this.hasMore = !!result.nextPageToken;

      this.renderPhotos(result.mediaItems, !reset);
      this.updateLoadMoreButton();
      this.updateEmptyState();

    } catch (error) {
      console.error('Failed to load photos:', error);
      this.showError('Failed to load photos: ' + error.message);
    } finally {
      this.loading = false;
      loadingEl.style.display = 'none';
    }
  }

  async loadMorePhotos() {
    if (!this.hasMore || this.loading) return;
    
    if (this.currentAlbum) {
      await this.loadAlbumPhotos(this.currentAlbum.id, false);
    } else {
      await this.loadLibraryPhotos(false);
    }
  }

  renderPhotos(photos, append = false) {
    const gridEl = document.getElementById('photoGrid');
    
    if (!append) {
      gridEl.innerHTML = '';
    }

    photos.forEach(photo => {
      const photoEl = this.createPhotoElement(photo);
      gridEl.appendChild(photoEl);
    });
  }

  createPhotoElement(photo) {
    const photoEl = document.createElement('div');
    photoEl.className = 'photo-item';
    photoEl.dataset.photoId = photo.id;
    
    const thumbnailUrl = this.dataService.getThumbnailUrl(photo.baseUrl, 200);
    const isSelected = this.selectionManager.isPhotoSelected(photo.id);
    
    photoEl.innerHTML = `
      <div class="photo-thumbnail-container">
        <img class="photo-thumbnail" 
             src="${thumbnailUrl}" 
             alt="${photo.filename}"
             loading="lazy" />
        <div class="selection-checkbox ${isSelected ? 'checked' : ''}" 
             data-type="photo" data-id="${photo.id}">
          ${isSelected ? '<span class="material-icons">check</span>' : ''}
        </div>
        <div class="photo-overlay">
          <div class="photo-info">
            <div class="photo-filename" title="${photo.filename}">${photo.filename}</div>
            <div class="photo-dimensions">${photo.mediaMetadata.width}×${photo.mediaMetadata.height}</div>
          </div>
        </div>
      </div>
    `;

    // Add click handler for selection
    photoEl.addEventListener('click', (e) => {
      this.togglePhotoSelection(photo);
    });

    return photoEl;
  }

  togglePhotoSelection(photo) {
    const isSelected = this.selectionManager.togglePhoto(photo);
    this.updatePhotoCheckbox(photo.id, isSelected);
    this.updateSelectAllButton();
  }

  updatePhotoCheckbox(photoId, isSelected) {
    const photoEl = document.querySelector(`[data-photo-id="${photoId}"]`);
    if (!photoEl) return;

    const checkbox = photoEl.querySelector('.selection-checkbox');
    if (isSelected) {
      checkbox.classList.add('checked');
      checkbox.innerHTML = '<span class="material-icons">check</span>';
    } else {
      checkbox.classList.remove('checked');
      checkbox.innerHTML = '';
    }
  }

  selectAllVisiblePhotos() {
    const visiblePhotos = this.getVisiblePhotos();
    const allSelected = visiblePhotos.every(photo => 
      this.selectionManager.isPhotoSelected(photo.id)
    );

    if (allSelected) {
      // Deselect all visible
      visiblePhotos.forEach(photo => {
        if (this.selectionManager.isPhotoSelected(photo.id)) {
          this.selectionManager.togglePhoto(photo);
          this.updatePhotoCheckbox(photo.id, false);
        }
      });
    } else {
      // Select all visible
      visiblePhotos.forEach(photo => {
        if (!this.selectionManager.isPhotoSelected(photo.id)) {
          this.selectionManager.togglePhoto(photo);
          this.updatePhotoCheckbox(photo.id, true);
        }
      });
    }

    this.updateSelectAllButton();
  }

  updateSelectAllButton() {
    const selectAllBtn = document.getElementById('selectAllPhotos');
    if (!selectAllBtn) return;

    const visiblePhotos = this.getVisiblePhotos();
    const selectedCount = visiblePhotos.filter(photo => 
      this.selectionManager.isPhotoSelected(photo.id)
    ).length;

    if (selectedCount === 0) {
      selectAllBtn.innerHTML = '<span class="material-icons">select_all</span> Select All';
    } else if (selectedCount === visiblePhotos.length) {
      selectAllBtn.innerHTML = '<span class="material-icons">deselect</span> Deselect All';
    } else {
      selectAllBtn.innerHTML = `<span class="material-icons">select_all</span> Select All (${selectedCount}/${visiblePhotos.length})`;
    }
  }

  getVisiblePhotos() {
    if (!this.searchTerm) return this.photos;
    
    return this.photos.filter(photo => 
      photo.filename.toLowerCase().includes(this.searchTerm)
    );
  }

  filterDisplayedPhotos() {
    const gridEl = document.getElementById('photoGrid');
    const photoEls = gridEl.querySelectorAll('.photo-item');
    
    photoEls.forEach(photoEl => {
      const photoId = photoEl.dataset.photoId;
      const photo = this.photos.find(p => p.id === photoId);
      
      if (!photo) return;
      
      const matches = photo.filename.toLowerCase().includes(this.searchTerm);
      photoEl.style.display = matches ? 'block' : 'none';
    });

    this.updateSelectAllButton();
    this.updateEmptyState();
  }

  updateLoadMoreButton() {
    const loadMoreEl = document.getElementById('photoLoadMore');
    loadMoreEl.style.display = this.hasMore ? 'block' : 'none';
  }

  updateEmptyState() {
    const emptyEl = document.getElementById('photoEmpty');
    const gridEl = document.getElementById('photoGrid');
    const visibleItems = gridEl.querySelectorAll('.photo-item:not([style*="display: none"])');
    
    emptyEl.style.display = (visibleItems.length === 0 && this.photos.length > 0) ? 'block' : 'none';
  }

  clearPhotos() {
    this.photos = [];
    this.currentPageToken = null;
    this.hasMore = true;
    const gridEl = document.getElementById('photoGrid');
    if (gridEl) gridEl.innerHTML = '';
  }

  showError(message) {
    // Use existing toast system if available
    if (window.showToast) {
      window.showToast(message, 'error');
    } else {
      alert(message);
    }
  }

  // Public methods for external control
  refreshPhotos() {
    if (this.currentAlbum) {
      this.loadAlbumPhotos(this.currentAlbum.id, true);
    } else {
      this.loadLibraryPhotos(true);
    }
  }

  getSelectedPhotos() {
    return this.selectionManager.getSelectedPhotos();
  }

  clearSelection() {
    this.selectionManager.clearPhotos();
    this.photos.forEach(photo => {
      this.updatePhotoCheckbox(photo.id, false);
    });
    this.updateSelectAllButton();
  }
}

window.PhotoBrowser = PhotoBrowser;