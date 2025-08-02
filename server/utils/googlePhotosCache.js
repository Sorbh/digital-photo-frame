class GooglePhotosCache {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes default TTL
    this.maxCacheSize = 1000; // Maximum number of cached items
    
    // Cleanup expired entries every 10 minutes
    setInterval(() => this.cleanup(), 10 * 60 * 1000);
  }

  generateKey(type, userId, ...params) {
    return `${type}:${userId}:${params.join(':')}`;
  }

  set(key, data, ttl = this.cacheTTL) {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const expiry = Date.now() + ttl;
    this.cache.set(key, {
      data,
      expiry,
      createdAt: Date.now()
    });

    console.log(`Cached data for key: ${key}`);
  }

  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      console.log(`Cache expired for key: ${key}`);
      return null;
    }

    console.log(`Cache hit for key: ${key}`);
    return item.data;
  }

  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      console.log(`Removed from cache: ${key}`);
    }
    return deleted;
  }

  // Clear all cache for a specific user
  clearUserCache(userId) {
    const keysToDelete = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(`:${userId}:`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`Cleared ${keysToDelete.length} cache entries for user: ${userId}`);
  }

  // Clear all cache
  clear() {
    const count = this.cache.size;
    this.cache.clear();
    console.log(`Cleared ${count} cache entries`);
  }

  // Remove expired entries
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cache cleanup: removed ${cleanedCount} expired entries`);
    }
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    let expiredCount = 0;
    let totalAge = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        expiredCount++;
      }
      totalAge += (now - item.createdAt);
    }

    return {
      totalEntries: this.cache.size,
      expiredEntries: expiredCount,
      averageAge: this.cache.size > 0 ? Math.round(totalAge / this.cache.size / 1000) : 0, // in seconds
      maxSize: this.maxCacheSize,
      ttlSeconds: Math.round(this.cacheTTL / 1000)
    };
  }

  // Cache-specific methods for Google Photos data

  cacheAlbums(userId, albums, nextPageToken, pageToken = null) {
    const key = this.generateKey('albums', userId, pageToken || 'first');
    this.set(key, { albums, nextPageToken });
  }

  getCachedAlbums(userId, pageToken = null) {
    const key = this.generateKey('albums', userId, pageToken || 'first');
    return this.get(key);
  }

  cacheAlbumPhotos(userId, albumId, photos, nextPageToken, pageToken = null) {
    const key = this.generateKey('album-photos', userId, albumId, pageToken || 'first');
    this.set(key, { photos, nextPageToken });
  }

  getCachedAlbumPhotos(userId, albumId, pageToken = null) {
    const key = this.generateKey('album-photos', userId, albumId, pageToken || 'first');
    return this.get(key);
  }

  cacheLibraryPhotos(userId, photos, nextPageToken, pageToken = null) {
    const key = this.generateKey('library-photos', userId, pageToken || 'first');
    this.set(key, { photos, nextPageToken });
  }

  getCachedLibraryPhotos(userId, pageToken = null) {
    const key = this.generateKey('library-photos', userId, pageToken || 'first');
    return this.get(key);
  }

  cacheMediaItem(userId, mediaItemId, mediaItem) {
    const key = this.generateKey('media-item', userId, mediaItemId);
    // Media items cache for longer since they don't change often
    this.set(key, mediaItem, 30 * 60 * 1000); // 30 minutes
  }

  getCachedMediaItem(userId, mediaItemId) {
    const key = this.generateKey('media-item', userId, mediaItemId);
    return this.get(key);
  }

  // Invalidate cache when user disconnects
  invalidateUserData(userId) {
    this.clearUserCache(userId);
  }
}

module.exports = new GooglePhotosCache();