const fetch = require('node-fetch');

class GooglePhotosApiService {
  constructor() {
    this.baseUrl = 'https://photoslibrary.googleapis.com/v1';
    this.defaultPageSize = 50;
    this.maxPageSize = 100;
  }

  async makeApiRequest(endpoint, accessToken, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const requestOptions = {
      ...defaultOptions,
      ...options
    };

    try {
      console.log(`Making API request to: ${endpoint}`);
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error(`API request failed: ${response.status} ${response.statusText}`, errorData);
        
        throw new Error(`Google Photos API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`API request successful: ${endpoint}`);
      return data;
    } catch (error) {
      console.error(`API request error for ${endpoint}:`, error.message);
      throw error;
    }
  }

  async getAlbums(accessToken, pageSize = this.defaultPageSize, pageToken = null) {
    try {
      // Validate page size
      const validPageSize = Math.min(Math.max(pageSize, 1), this.maxPageSize);
      
      let endpoint = `/albums?pageSize=${validPageSize}`;
      if (pageToken) {
        endpoint += `&pageToken=${encodeURIComponent(pageToken)}`;
      }

      const data = await this.makeApiRequest(endpoint, accessToken);
      
      return {
        albums: (data.albums || []).map(album => this.transformAlbum(album)),
        nextPageToken: data.nextPageToken || null
      };
    } catch (error) {
      throw new Error(`Failed to retrieve albums: ${error.message}`);
    }
  }

  async getAlbumPhotos(accessToken, albumId, pageSize = this.defaultPageSize, pageToken = null) {
    try {
      // Validate page size
      const validPageSize = Math.min(Math.max(pageSize, 1), this.maxPageSize);
      
      const requestBody = {
        albumId: albumId,
        pageSize: validPageSize
      };

      if (pageToken) {
        requestBody.pageToken = pageToken;
      }

      const data = await this.makeApiRequest('/mediaItems:search', accessToken, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      return {
        mediaItems: (data.mediaItems || []).map(item => this.transformMediaItem(item)),
        nextPageToken: data.nextPageToken || null
      };
    } catch (error) {
      throw new Error(`Failed to retrieve album photos: ${error.message}`);
    }
  }

  async getLibraryPhotos(accessToken, pageSize = this.defaultPageSize, pageToken = null) {
    try {
      // Validate page size
      const validPageSize = Math.min(Math.max(pageSize, 1), this.maxPageSize);
      
      let endpoint = `/mediaItems?pageSize=${validPageSize}`;
      if (pageToken) {
        endpoint += `&pageToken=${encodeURIComponent(pageToken)}`;
      }

      const data = await this.makeApiRequest(endpoint, accessToken);
      
      return {
        mediaItems: (data.mediaItems || []).map(item => this.transformMediaItem(item)),
        nextPageToken: data.nextPageToken || null
      };
    } catch (error) {
      throw new Error(`Failed to retrieve library photos: ${error.message}`);
    }
  }

  async getMediaItem(accessToken, mediaItemId) {
    try {
      const data = await this.makeApiRequest(`/mediaItems/${mediaItemId}`, accessToken);
      return this.transformMediaItem(data);
    } catch (error) {
      throw new Error(`Failed to retrieve media item: ${error.message}`);
    }
  }

  transformAlbum(album) {
    return {
      id: album.id,
      title: album.title || 'Untitled Album',
      mediaItemsCount: parseInt(album.mediaItemsCount) || 0,
      coverPhotoBaseUrl: album.coverPhotoBaseUrl || null,
      coverPhotoMediaItemId: album.coverPhotoMediaItemId || null,
      isWriteable: album.isWriteable || false,
      shareInfo: album.shareInfo || null
    };
  }

  transformMediaItem(mediaItem) {
    const metadata = mediaItem.mediaMetadata || {};
    
    return {
      id: mediaItem.id,
      filename: mediaItem.filename || 'untitled',
      baseUrl: mediaItem.baseUrl,
      mimeType: mediaItem.mimeType || 'image/jpeg',
      mediaMetadata: {
        width: metadata.width || '0',
        height: metadata.height || '0',
        creationTime: metadata.creationTime || new Date().toISOString()
      },
      contributorInfo: mediaItem.contributorInfo || null
    };
  }

  // Helper method to get download URL with size parameters
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
    
    // Add download parameter for full quality
    params.push('d');
    
    if (params.length > 0) {
      url += `=${params.join('-')}`;
    }
    
    return url;
  }

  // Helper method to get thumbnail URL
  getThumbnailUrl(baseUrl, size = 200) {
    return this.getDownloadUrl(baseUrl, size, size);
  }

  // Validate API response and handle common errors
  validateApiResponse(data, endpoint) {
    if (!data) {
      throw new Error(`No data received from ${endpoint}`);
    }

    if (data.error) {
      const error = data.error;
      throw new Error(`API Error ${error.code}: ${error.message}`);
    }

    return true;
  }

  // Rate limiting helper
  async waitForRateLimit(retryAfter = 1000) {
    console.log(`Rate limited, waiting ${retryAfter}ms before retry...`);
    return new Promise(resolve => setTimeout(resolve, retryAfter));
  }
}

module.exports = new GooglePhotosApiService();