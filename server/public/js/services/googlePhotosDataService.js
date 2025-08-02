class GooglePhotosDataService {
  constructor() {
    this.baseUrl = '/api/admin/google-photos';
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  // Generic API request handler
  async makeRequest(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || `HTTP ${response.status}`);
      }

      if (!result.success) {
        throw new Error(result.error?.message || 'Request failed');
      }

      return result.data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Cache management
  getCacheKey(endpoint, params = {}) {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `${endpoint}?${paramString}`;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  getCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clearCache() {
    this.cache.clear();
  }

  // Authentication status
  async getAuthStatus() {
    return await this.makeRequest('/status');
  }

  // Albums
  async getAlbums(pageSize = 50, pageToken = null) {
    const params = { pageSize };
    if (pageToken) params.pageToken = pageToken;

    const cacheKey = this.getCacheKey('/albums', params);
    const cached = this.getCache(cacheKey);
    if (cached) {
      console.log('Returning cached albums');
      return cached;
    }

    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/albums?${queryString}`;
    
    const result = await this.makeRequest(endpoint);
    this.setCache(cacheKey, result);
    
    return result;
  }

  // Photos in album
  async getAlbumPhotos(albumId, pageSize = 50, pageToken = null) {
    if (!albumId) {
      throw new Error('Album ID is required');
    }

    const params = { pageSize };
    if (pageToken) params.pageToken = pageToken;

    const cacheKey = this.getCacheKey(`/albums/${albumId}/photos`, params);
    const cached = this.getCache(cacheKey);
    if (cached) {
      console.log('Returning cached album photos');
      return cached;
    }

    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/albums/${albumId}/photos?${queryString}`;
    
    const result = await this.makeRequest(endpoint);
    this.setCache(cacheKey, result);
    
    return result;
  }

  // Library photos
  async getLibraryPhotos(pageSize = 50, pageToken = null) {
    const params = { pageSize };
    if (pageToken) params.pageToken = pageToken;

    const cacheKey = this.getCacheKey('/photos', params);
    const cached = this.getCache(cacheKey);
    if (cached) {
      console.log('Returning cached library photos');
      return cached;
    }

    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/photos?${queryString}`;
    
    const result = await this.makeRequest(endpoint);
    this.setCache(cacheKey, result);
    
    return result;
  }

  // Get specific media item
  async getMediaItem(mediaItemId) {
    if (!mediaItemId) {
      throw new Error('Media item ID is required');
    }

    const cacheKey = this.getCacheKey(`/media/${mediaItemId}`);
    const cached = this.getCache(cacheKey);
    if (cached) {
      console.log('Returning cached media item');
      return cached;
    }

    const result = await this.makeRequest(`/media/${mediaItemId}`);
    this.setCache(cacheKey, result);
    
    return result;
  }

  // Helper methods for pagination
  async getAllAlbums() {
    const allAlbums = [];
    let pageToken = null;
    
    do {
      const result = await this.getAlbums(50, pageToken);
      allAlbums.push(...result.albums);
      pageToken = result.nextPageToken;
    } while (pageToken);
    
    return allAlbums;
  }

  async getAllAlbumPhotos(albumId) {
    const allPhotos = [];
    let pageToken = null;
    
    do {
      const result = await this.getAlbumPhotos(albumId, 50, pageToken);
      allPhotos.push(...result.mediaItems);
      pageToken = result.nextPageToken;
    } while (pageToken);
    
    return allPhotos;
  }

  // URL helpers
  getThumbnailUrl(baseUrl, size = 200) {
    if (!baseUrl) return null;
    return `${baseUrl}=w${size}-h${size}-c`;
  }

  getDownloadUrl(baseUrl, width = null, height = null) {
    if (!baseUrl) return null;
    
    let url = baseUrl;
    const params = [];
    
    if (width && height) {
      params.push(`w${width}-h${height}`);
    } else if (width) {
      params.push(`w${width}`);
    } else if (height) {
      params.push(`h${height}`);
    }
    
    // Add download parameter
    params.push('d');
    
    if (params.length > 0) {
      url += `=${params.join('-')}`;
    }
    
    return url;
  }

  // Error handling helpers
  isAuthError(error) {
    return error.message.includes('Not authenticated') || 
           error.message.includes('Authentication required') ||
           error.message.includes('401');
  }

  isRateLimitError(error) {
    return error.message.includes('quota') || 
           error.message.includes('rate limit') ||
           error.message.includes('429');
  }

  // Batch operations with error handling
  async batchRequest(requests, maxConcurrent = 3) {
    const results = [];
    const errors = [];
    
    for (let i = 0; i < requests.length; i += maxConcurrent) {
      const batch = requests.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async (request, index) => {
        try {
          const result = await request();
          return { index: i + index, result };
        } catch (error) {
          console.error(`Batch request ${i + index} failed:`, error);
          return { index: i + index, error };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      for (const item of batchResults) {
        if (item.error) {
          errors.push({ index: item.index, error: item.error });
        } else {
          results.push({ index: item.index, result: item.result });
        }
      }
      
      // Small delay between batches to avoid rate limiting
      if (i + maxConcurrent < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return { results, errors };
  }
}

// Export as global for use in other scripts
window.GooglePhotosDataService = GooglePhotosDataService;