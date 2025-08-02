class AlbumBrowser {
  constructor(dataService, selectionManager) {
    this.dataService = dataService;
    this.selectionManager = selectionManager;
    this.albums = [];
    this.currentPageToken = null;
    this.loading = false;
    this.hasMore = true;
    this.searchTerm = '';
    this.pageSize = 20;
  }

  render(container) {
    container.innerHTML = `
      <div class="browser-section">
        <div class="browser-header">
          <h3>Select Albums</h3>
          <div class="browser-controls">
            <div class="search-box">
              <span class="material-icons">search</span>
              <input type="text" id="albumSearch" placeholder="Search albums..." />
            </div>
            <button id="selectAllAlbums" class="btn-secondary">
              <span class="material-icons">select_all</span>
              Select All
            </button>
          </div>
        </div>
        
        <div class="browser-grid" id="albumGrid">
          <!-- Albums will be loaded here -->
        </div>
        
        <div class="browser-loading" id="albumLoading" style="display: none;">
          <span class="material-icons">hourglass_empty</span>
          <span>Loading albums...</span>
        </div>
        
        <div class="browser-load-more" id="albumLoadMore" style="display: none;">
          <button class="btn-secondary">Load More Albums</button>
        </div>
        
        <div class="browser-empty" id="albumEmpty" style="display: none;">
          <span class="material-icons">photo_album</span>
          <p>No albums found</p>
        </div>
      </div>
    `;

    this.bindEvents(container);
    this.loadAlbums();
  }

  bindEvents(container) {
    // Search functionality
    const searchInput = container.querySelector('#albumSearch');
    searchInput.addEventListener('input', (e) => {
      this.searchTerm = e.target.value.toLowerCase();
      this.filterDisplayedAlbums();
    });

    // Select all albums
    const selectAllBtn = container.querySelector('#selectAllAlbums');
    selectAllBtn.addEventListener('click', () => {
      this.selectAllVisibleAlbums();
    });

    // Load more button
    const loadMoreBtn = container.querySelector('#albumLoadMore button');
    loadMoreBtn.addEventListener('click', () => {
      this.loadMoreAlbums();
    });
  }

  async loadAlbums(reset = true) {
    if (this.loading) return;

    this.loading = true;
    const loadingEl = document.getElementById('albumLoading');
    const gridEl = document.getElementById('albumGrid');
    
    if (reset) {
      this.albums = [];
      this.currentPageToken = null;
      this.hasMore = true;
      gridEl.innerHTML = '';
    }

    loadingEl.style.display = 'flex';

    try {
      const result = await this.dataService.getAlbums(this.pageSize, this.currentPageToken);
      
      this.albums.push(...result.albums);
      this.currentPageToken = result.nextPageToken;
      this.hasMore = !!result.nextPageToken;

      this.renderAlbums(result.albums, !reset);
      this.updateLoadMoreButton();
      this.updateEmptyState();

    } catch (error) {
      console.error('Failed to load albums:', error);
      this.showError('Failed to load albums: ' + error.message);
    } finally {
      this.loading = false;
      loadingEl.style.display = 'none';
    }
  }

  async loadMoreAlbums() {
    if (!this.hasMore || this.loading) return;
    await this.loadAlbums(false);
  }

  renderAlbums(albums, append = false) {
    const gridEl = document.getElementById('albumGrid');
    
    if (!append) {
      gridEl.innerHTML = '';
    }

    albums.forEach(album => {
      const albumEl = this.createAlbumElement(album);
      gridEl.appendChild(albumEl);
    });
  }

  createAlbumElement(album) {
    const albumEl = document.createElement('div');
    albumEl.className = 'album-item';
    albumEl.dataset.albumId = album.id;
    
    const thumbnailUrl = this.dataService.getThumbnailUrl(album.coverPhotoBaseUrl, 200);
    const isSelected = this.selectionManager.isAlbumSelected(album.id);
    
    albumEl.innerHTML = `
      <div class="album-thumbnail-container">
        <img class="album-thumbnail" 
             src="${thumbnailUrl || '/images/default-album.png'}" 
             alt="${album.title}"
             loading="lazy"
             onerror="this.src='/images/default-album.png'" />
        <div class="selection-checkbox ${isSelected ? 'checked' : ''}" 
             data-type="album" data-id="${album.id}">
          ${isSelected ? '<span class="material-icons">check</span>' : ''}
        </div>
      </div>
      <div class="album-info">
        <div class="album-title" title="${album.title}">${album.title}</div>
        <div class="album-count">${album.mediaItemsCount} photos</div>
      </div>
    `;

    // Add click handlers
    albumEl.addEventListener('click', (e) => {
      if (!e.target.closest('.selection-checkbox')) {
        this.openAlbum(album);
      }
    });

    const checkbox = albumEl.querySelector('.selection-checkbox');
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleAlbumSelection(album);
    });

    return albumEl;
  }

  toggleAlbumSelection(album) {
    const isSelected = this.selectionManager.toggleAlbum(album);
    this.updateAlbumCheckbox(album.id, isSelected);
    this.updateSelectAllButton();
  }

  updateAlbumCheckbox(albumId, isSelected) {
    const albumEl = document.querySelector(`[data-album-id="${albumId}"]`);
    if (!albumEl) return;

    const checkbox = albumEl.querySelector('.selection-checkbox');
    if (isSelected) {
      checkbox.classList.add('checked');
      checkbox.innerHTML = '<span class="material-icons">check</span>';
    } else {
      checkbox.classList.remove('checked');
      checkbox.innerHTML = '';
    }
  }

  selectAllVisibleAlbums() {
    const visibleAlbums = this.getVisibleAlbums();
    const allSelected = visibleAlbums.every(album => 
      this.selectionManager.isAlbumSelected(album.id)
    );

    if (allSelected) {
      // Deselect all visible
      visibleAlbums.forEach(album => {
        if (this.selectionManager.isAlbumSelected(album.id)) {
          this.selectionManager.toggleAlbum(album);
          this.updateAlbumCheckbox(album.id, false);
        }
      });
    } else {
      // Select all visible
      visibleAlbums.forEach(album => {
        if (!this.selectionManager.isAlbumSelected(album.id)) {
          this.selectionManager.toggleAlbum(album);
          this.updateAlbumCheckbox(album.id, true);
        }
      });
    }

    this.updateSelectAllButton();
  }

  updateSelectAllButton() {
    const selectAllBtn = document.getElementById('selectAllAlbums');
    if (!selectAllBtn) return;

    const visibleAlbums = this.getVisibleAlbums();
    const selectedCount = visibleAlbums.filter(album => 
      this.selectionManager.isAlbumSelected(album.id)
    ).length;

    if (selectedCount === 0) {
      selectAllBtn.innerHTML = '<span class="material-icons">select_all</span> Select All';
    } else if (selectedCount === visibleAlbums.length) {
      selectAllBtn.innerHTML = '<span class="material-icons">deselect</span> Deselect All';
    } else {
      selectAllBtn.innerHTML = `<span class="material-icons">select_all</span> Select All (${selectedCount}/${visibleAlbums.length})`;
    }
  }

  getVisibleAlbums() {
    if (!this.searchTerm) return this.albums;
    
    return this.albums.filter(album => 
      album.title.toLowerCase().includes(this.searchTerm)
    );
  }

  filterDisplayedAlbums() {
    const gridEl = document.getElementById('albumGrid');
    const albumEls = gridEl.querySelectorAll('.album-item');
    
    albumEls.forEach(albumEl => {
      const albumId = albumEl.dataset.albumId;
      const album = this.albums.find(a => a.id === albumId);
      
      if (!album) return;
      
      const matches = album.title.toLowerCase().includes(this.searchTerm);
      albumEl.style.display = matches ? 'block' : 'none';
    });

    this.updateSelectAllButton();
    this.updateEmptyState();
  }

  updateLoadMoreButton() {
    const loadMoreEl = document.getElementById('albumLoadMore');
    loadMoreEl.style.display = this.hasMore ? 'block' : 'none';
  }

  updateEmptyState() {
    const emptyEl = document.getElementById('albumEmpty');
    const gridEl = document.getElementById('albumGrid');
    const visibleItems = gridEl.querySelectorAll('.album-item:not([style*="display: none"])');
    
    emptyEl.style.display = (visibleItems.length === 0 && this.albums.length > 0) ? 'block' : 'none';
  }

  openAlbum(album) {
    // Trigger album opened event
    const event = new CustomEvent('albumOpened', { 
      detail: { album } 
    });
    document.dispatchEvent(event);
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
  refreshAlbums() {
    this.loadAlbums(true);
  }

  getSelectedAlbums() {
    return this.selectionManager.getSelectedAlbums();
  }

  clearSelection() {
    this.selectionManager.clearAlbums();
    this.albums.forEach(album => {
      this.updateAlbumCheckbox(album.id, false);
    });
    this.updateSelectAllButton();
  }
}

window.AlbumBrowser = AlbumBrowser;