class SelectionManager {
  constructor() {
    this.selectedAlbums = new Map(); // albumId -> album object
    this.selectedPhotos = new Map(); // photoId -> photo object
    this.albumPhotoSelections = new Map(); // albumId -> Set of photoIds
    this.callbacks = [];
  }

  // Callback management
  addChangeCallback(callback) {
    this.callbacks.push(callback);
  }

  removeChangeCallback(callback) {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  notifyChange() {
    this.callbacks.forEach(callback => {
      try {
        callback(this.getSelectionSummary());
      } catch (error) {
        console.error('Selection callback error:', error);
      }
    });
  }

  // Album selection methods
  toggleAlbum(album) {
    const isSelected = this.selectedAlbums.has(album.id);
    
    if (isSelected) {
      this.selectedAlbums.delete(album.id);
      // Also remove any individual photo selections from this album
      if (this.albumPhotoSelections.has(album.id)) {
        const photoIds = this.albumPhotoSelections.get(album.id);
        photoIds.forEach(photoId => this.selectedPhotos.delete(photoId));
        this.albumPhotoSelections.delete(album.id);
      }
    } else {
      this.selectedAlbums.set(album.id, album);
    }

    this.notifyChange();
    return !isSelected;
  }

  selectAlbum(album) {
    if (!this.selectedAlbums.has(album.id)) {
      this.selectedAlbums.set(album.id, album);
      this.notifyChange();
    }
    return true;
  }

  deselectAlbum(albumId) {
    if (this.selectedAlbums.has(albumId)) {
      this.selectedAlbums.delete(albumId);
      // Also remove any individual photo selections from this album
      if (this.albumPhotoSelections.has(albumId)) {
        const photoIds = this.albumPhotoSelections.get(albumId);
        photoIds.forEach(photoId => this.selectedPhotos.delete(photoId));
        this.albumPhotoSelections.delete(albumId);
      }
      this.notifyChange();
    }
    return false;
  }

  isAlbumSelected(albumId) {
    return this.selectedAlbums.has(albumId);
  }

  // Photo selection methods
  togglePhoto(photo, albumId = null) {
    const isSelected = this.selectedPhotos.has(photo.id);
    
    if (isSelected) {
      this.selectedPhotos.delete(photo.id);
      // Remove from album photo selections if applicable
      if (albumId && this.albumPhotoSelections.has(albumId)) {
        this.albumPhotoSelections.get(albumId).delete(photo.id);
        if (this.albumPhotoSelections.get(albumId).size === 0) {
          this.albumPhotoSelections.delete(albumId);
        }
      }
    } else {
      this.selectedPhotos.set(photo.id, photo);
      // Add to album photo selections if applicable
      if (albumId) {
        if (!this.albumPhotoSelections.has(albumId)) {
          this.albumPhotoSelections.set(albumId, new Set());
        }
        this.albumPhotoSelections.get(albumId).add(photo.id);
      }
    }

    this.notifyChange();
    return !isSelected;
  }

  selectPhoto(photo, albumId = null) {
    if (!this.selectedPhotos.has(photo.id)) {
      this.selectedPhotos.set(photo.id, photo);
      if (albumId) {
        if (!this.albumPhotoSelections.has(albumId)) {
          this.albumPhotoSelections.set(albumId, new Set());
        }
        this.albumPhotoSelections.get(albumId).add(photo.id);
      }
      this.notifyChange();
    }
    return true;
  }

  deselectPhoto(photoId) {
    if (this.selectedPhotos.has(photoId)) {
      this.selectedPhotos.delete(photoId);
      // Remove from all album photo selections
      for (const [albumId, photoIds] of this.albumPhotoSelections.entries()) {
        if (photoIds.has(photoId)) {
          photoIds.delete(photoId);
          if (photoIds.size === 0) {
            this.albumPhotoSelections.delete(albumId);
          }
        }
      }
      this.notifyChange();
    }
    return false;
  }

  isPhotoSelected(photoId) {
    return this.selectedPhotos.has(photoId);
  }

  // Bulk selection methods
  selectAllPhotosInAlbum(albumId, photos) {
    photos.forEach(photo => {
      this.selectPhoto(photo, albumId);
    });
  }

  deselectAllPhotosInAlbum(albumId) {
    if (this.albumPhotoSelections.has(albumId)) {
      const photoIds = this.albumPhotoSelections.get(albumId);
      photoIds.forEach(photoId => this.selectedPhotos.delete(photoId));
      this.albumPhotoSelections.delete(albumId);
      this.notifyChange();
    }
  }

  // Getter methods
  getSelectedAlbums() {
    return Array.from(this.selectedAlbums.values());
  }

  getSelectedPhotos() {
    return Array.from(this.selectedPhotos.values());
  }

  getSelectedAlbumIds() {
    return Array.from(this.selectedAlbums.keys());
  }

  getSelectedPhotoIds() {
    return Array.from(this.selectedPhotos.keys());
  }

  getAlbumPhotoSelections() {
    const result = {};
    for (const [albumId, photoIds] of this.albumPhotoSelections.entries()) {
      result[albumId] = Array.from(photoIds);
    }
    return result;
  }

  // Selection summary
  getSelectionSummary() {
    const albumCount = this.selectedAlbums.size;
    const photoCount = this.selectedPhotos.size;
    const albumPhotoCount = Array.from(this.albumPhotoSelections.values())
      .reduce((total, photoIds) => total + photoIds.size, 0);

    return {
      albumCount,
      photoCount: photoCount - albumPhotoCount, // Individual photos (not from selected albums)
      totalItems: albumCount + photoCount,
      hasSelection: albumCount > 0 || photoCount > 0,
      albums: this.getSelectedAlbums(),
      photos: this.getSelectedPhotos(),
      albumPhotoSelections: this.getAlbumPhotoSelections()
    };
  }

  // Clear methods
  clearAlbums() {
    this.selectedAlbums.clear();
    // Clear related album photo selections
    for (const photoIds of this.albumPhotoSelections.values()) {
      photoIds.forEach(photoId => this.selectedPhotos.delete(photoId));
    }
    this.albumPhotoSelections.clear();
    this.notifyChange();
  }

  clearPhotos() {
    this.selectedPhotos.clear();
    this.albumPhotoSelections.clear();
    this.notifyChange();
  }

  clearAll() {
    this.selectedAlbums.clear();
    this.selectedPhotos.clear();
    this.albumPhotoSelections.clear();
    this.notifyChange();
  }

  // Validation and utility methods
  validateSelection() {
    const errors = [];
    
    if (this.selectedAlbums.size === 0 && this.selectedPhotos.size === 0) {
      errors.push('No albums or photos selected');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Export/import for persistence
  exportSelection() {
    return {
      albums: this.getSelectedAlbums(),
      photos: this.getSelectedPhotos(),
      albumPhotoSelections: this.getAlbumPhotoSelections(),
      timestamp: Date.now()
    };
  }

  importSelection(data) {
    this.clearAll();
    
    if (data.albums) {
      data.albums.forEach(album => {
        this.selectedAlbums.set(album.id, album);
      });
    }
    
    if (data.photos) {
      data.photos.forEach(photo => {
        this.selectedPhotos.set(photo.id, photo);
      });
    }
    
    if (data.albumPhotoSelections) {
      for (const [albumId, photoIds] of Object.entries(data.albumPhotoSelections)) {
        this.albumPhotoSelections.set(albumId, new Set(photoIds));
      }
    }
    
    this.notifyChange();
  }

  // Generate sync payload for backend
  generateSyncPayload() {
    const albums = this.getSelectedAlbums().map(album => ({
      id: album.id,
      title: album.title,
      selectAll: true, // When album is selected, we want all photos
      selectedPhotos: [] // Empty since selectAll is true
    }));

    // Add individual photos that aren't part of selected albums
    const individualPhotos = [];
    for (const photo of this.selectedPhotos.values()) {
      // Check if this photo is part of a selected album
      let isFromSelectedAlbum = false;
      for (const albumId of this.selectedAlbums.keys()) {
        if (this.albumPhotoSelections.has(albumId) && 
            this.albumPhotoSelections.get(albumId).has(photo.id)) {
          isFromSelectedAlbum = true;
          break;
        }
      }
      
      if (!isFromSelectedAlbum) {
        individualPhotos.push({
          id: photo.id,
          filename: photo.filename,
          baseUrl: photo.baseUrl
        });
      }
    }

    return {
      albums,
      individualPhotos
    };
  }

  // Statistics
  getStatistics() {
    const summary = this.getSelectionSummary();
    const albumPhotoCount = Array.from(this.albumPhotoSelections.values())
      .reduce((total, photoIds) => total + photoIds.size, 0);

    return {
      selectedAlbums: summary.albumCount,
      selectedIndividualPhotos: summary.photoCount,
      totalSelectedPhotos: summary.photoCount + albumPhotoCount,
      totalSelections: summary.totalItems,
      isEmpty: !summary.hasSelection
    };
  }
}

window.SelectionManager = SelectionManager;