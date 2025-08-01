/**
 * Folder Browser Component - Visual folder selection with thumbnail grid
 */
class FolderBrowser {
    constructor(container, options = {}) {
        this.container = container;
        this.folderService = new FolderService();
        this.folderStorage = new FolderStorage();
        
        // Configuration options
        this.options = {
            showBreadcrumb: options.showBreadcrumb !== false,
            showAllFoldersOption: options.showAllFoldersOption !== false,
            onFolderSelected: options.onFolderSelected || null,
            onFolderChanged: options.onFolderChanged || null,
            ...options
        };
        
        // State
        this.currentPath = '';
        this.currentFolder = null;
        this.isLoading = false;
        
        this.initializeComponent();
        this.loadCurrentFolder();
    }

    /**
     * Initialize the component HTML structure
     */
    initializeComponent() {
        this.container.innerHTML = `
            <div class="folder-browser">
                ${this.options.showBreadcrumb ? `
                    <div class="folder-breadcrumb">
                        <div class="breadcrumb-container"></div>
                    </div>
                ` : ''}
                
                <div class="folder-controls">
                    ${this.options.showAllFoldersOption ? `
                        <button class="folder-option all-folders-btn" data-path="">
                            <div class="folder-icon">
                                <span class="material-icons">photo_library</span>
                            </div>
                            <div class="folder-info">
                                <div class="folder-name">All Folders</div>
                                <div class="folder-count">All images</div>
                            </div>
                        </button>
                    ` : ''}
                </div>
                
                <div class="folder-grid">
                    <!-- Folders will be loaded here -->
                </div>
                
                <div class="folder-loading hidden">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">Loading folders...</div>
                </div>
                
                <div class="folder-error hidden">
                    <span class="material-icons">error</span>
                    <div class="error-text">Failed to load folders</div>
                    <button class="retry-btn">Retry</button>
                </div>
            </div>
        `;

        this.setupEventListeners();
        this.addStyles();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Folder selection
        this.container.addEventListener('click', (e) => {
            const folderBtn = e.target.closest('.folder-option');
            if (folderBtn) {
                e.preventDefault();
                const folderPath = folderBtn.dataset.path;
                const folderName = folderBtn.querySelector('.folder-name')?.textContent || '';
                this.selectFolder(folderPath, folderName);
            }

            // Folder navigation (enter subfolder)
            const navBtn = e.target.closest('.folder-nav');
            if (navBtn) {
                e.preventDefault();
                const folderPath = navBtn.dataset.path;
                this.navigateToFolder(folderPath);
            }

            // Breadcrumb navigation
            const breadcrumbBtn = e.target.closest('.breadcrumb-item');
            if (breadcrumbBtn) {
                e.preventDefault();
                const folderPath = breadcrumbBtn.dataset.path;
                this.navigateToFolder(folderPath);
            }

            // Retry button
            const retryBtn = e.target.closest('.retry-btn');
            if (retryBtn) {
                e.preventDefault();
                this.loadCurrentFolder();
            }
        });
    }

    /**
     * Add component styles
     */
    addStyles() {
        if (document.getElementById('folder-browser-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'folder-browser-styles';
        styles.textContent = `
            .folder-browser {
                width: 100%;
                max-width: 800px;
                margin: 0 auto;
            }

            .folder-breadcrumb {
                margin-bottom: 20px;
                padding: 10px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                backdrop-filter: blur(10px);
            }

            .breadcrumb-container {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
            }

            .breadcrumb-item {
                display: flex;
                align-items: center;
                padding: 4px 8px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                color: #fff;
                transition: background 0.2s;
            }

            .breadcrumb-item:hover {
                background: rgba(255, 255, 255, 0.3);
            }

            .breadcrumb-separator {
                color: rgba(255, 255, 255, 0.6);
                font-size: 12px;
            }

            .folder-controls {
                margin-bottom: 20px;
            }

            .folder-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 16px;
                margin-bottom: 20px;
            }

            .folder-option {
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid transparent;
                border-radius: 12px;
                padding: 16px;
                cursor: pointer;
                transition: all 0.3s ease;
                backdrop-filter: blur(10px);
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                min-height: 180px;
            }

            .folder-option:hover {
                background: rgba(255, 255, 255, 0.2);
                border-color: rgba(255, 255, 255, 0.3);
                transform: translateY(-2px);
            }

            .folder-option.selected {
                border-color: #4CAF50;
                background: rgba(76, 175, 80, 0.2);
            }

            .folder-option.all-folders-btn {
                background: rgba(33, 150, 243, 0.2);
                border-color: rgba(33, 150, 243, 0.3);
                grid-column: 1 / -1;
                max-width: 300px;
                margin: 0 auto 20px;
                flex-direction: row;
                min-height: auto;
                padding: 12px 20px;
            }

            .folder-option.all-folders-btn:hover {
                background: rgba(33, 150, 243, 0.3);
            }

            .folder-thumbnail {
                width: 80px;
                height: 80px;
                border-radius: 8px;
                object-fit: cover;
                margin-bottom: 12px;
                background: rgba(255, 255, 255, 0.1);
            }

            .folder-icon {
                font-size: 48px;
                color: rgba(255, 255, 255, 0.7);
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .all-folders-btn .folder-icon {
                font-size: 24px;
                margin-bottom: 0;
                margin-right: 12px;
            }

            .folder-info {
                color: #fff;
                flex-grow: 1;
            }

            .folder-name {
                font-size: 16px;
                font-weight: 500;
                margin-bottom: 4px;
                word-break: break-word;
            }

            .folder-count {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.7);
            }

            .folder-nav {
                position: absolute;
                top: 8px;
                right: 8px;
                background: rgba(0, 0, 0, 0.5);
                border: none;
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 16px;
                transition: background 0.2s;
            }

            .folder-nav:hover {
                background: rgba(0, 0, 0, 0.7);
            }

            .folder-option {
                position: relative;
            }

            .folder-loading {
                text-align: center;
                padding: 40px;
                color: #fff;
            }

            .loading-spinner {
                width: 40px;
                height: 40px;
                margin: 0 auto 16px;
                border: 3px solid rgba(255, 255, 255, 0.2);
                border-top: 3px solid #fff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .folder-error {
                text-align: center;
                padding: 40px;
                color: #ff6b6b;
            }

            .folder-error .material-icons {
                font-size: 48px;
                margin-bottom: 16px;
            }

            .retry-btn {
                background: #ff6b6b;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 16px;
            }

            .retry-btn:hover {
                background: #ff5252;
            }

            @media (max-width: 600px) {
                .folder-grid {
                    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                    gap: 12px;
                }

                .folder-option {
                    padding: 12px;
                    min-height: 140px;
                }

                .folder-thumbnail {
                    width: 60px;
                    height: 60px;
                }

                .folder-icon {
                    font-size: 36px;
                }

                .folder-name {
                    font-size: 14px;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    /**
     * Navigate to a specific folder
     * @param {string} folderPath - Path to navigate to
     */
    async navigateToFolder(folderPath) {
        this.currentPath = folderPath;
        await this.loadCurrentFolder();
    }

    /**
     * Select a folder (save selection and trigger callback)
     * @param {string} folderPath - Selected folder path
     * @param {string} folderName - Display name of selected folder
     */
    selectFolder(folderPath, folderName) {
        // Save selection
        this.folderStorage.saveSelectedFolder(folderPath, folderName);
        
        // Update visual state
        this.updateSelectedState();
        
        // Trigger callbacks
        if (this.options.onFolderSelected) {
            this.options.onFolderSelected(folderPath, folderName);
        }
        
        if (this.options.onFolderChanged) {
            this.options.onFolderChanged(folderPath, folderName);
        }
    }

    /**
     * Load current folder data from API
     */
    async loadCurrentFolder() {
        if (this.isLoading) return;
        
        this.showLoading(true);
        this.hideError();
        
        try {
            const data = await this.folderService.getFolderStructure(this.currentPath);
            this.currentFolder = data;
            this.renderFolderContent();
            this.updateBreadcrumb();
            this.updateSelectedState();
        } catch (error) {
            console.error('Error loading folder:', error);
            this.showError(error.message);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Render folder content in the grid
     */
    renderFolderContent() {
        const grid = this.container.querySelector('.folder-grid');
        if (!grid) return;

        grid.innerHTML = '';

        if (this.currentFolder.folders) {
            // Root level - show all folders
            this.currentFolder.folders.forEach(folder => {
                grid.appendChild(this.createFolderElement(folder, false));
            });
        } else if (this.currentFolder.subfolders) {
            // Specific folder - show subfolders
            this.currentFolder.subfolders.forEach(folder => {
                grid.appendChild(this.createFolderElement(folder, true));
            });
        }
    }

    /**
     * Create folder element
     * @param {Object} folder - Folder data
     * @param {boolean} hasSubfolders - Whether folder has subfolders to navigate into
     * @returns {HTMLElement} Folder element
     */
    createFolderElement(folder, hasSubfolders = false) {
        const element = document.createElement('div');
        element.className = 'folder-option';
        element.dataset.path = folder.path;

        const thumbnailHtml = folder.thumbnail 
            ? `<img src="${folder.thumbnail}" alt="${folder.name}" class="folder-thumbnail" loading="lazy">`
            : `<div class="folder-icon"><span class="material-icons">folder</span></div>`;

        const navigationBtn = hasSubfolders && folder.hasSubfolders 
            ? `<button class="folder-nav" data-path="${folder.path}" title="Browse folder">
                 <span class="material-icons">arrow_forward</span>
               </button>`
            : '';

        element.innerHTML = `
            ${thumbnailHtml}
            <div class="folder-info">
                <div class="folder-name">${folder.name}</div>
                <div class="folder-count">${folder.imageCount} images</div>
            </div>
            ${navigationBtn}
        `;

        return element;
    }

    /**
     * Update breadcrumb navigation
     */
    updateBreadcrumb() {
        if (!this.options.showBreadcrumb) return;
        
        const container = this.container.querySelector('.breadcrumb-container');
        if (!container) return;

        container.innerHTML = '';

        if (this.currentFolder.folder && this.currentFolder.folder.breadcrumb) {
            this.currentFolder.folder.breadcrumb.forEach((item, index) => {
                if (index > 0) {
                    const separator = document.createElement('span');
                    separator.className = 'breadcrumb-separator';
                    separator.textContent = '>';
                    container.appendChild(separator);
                }

                const breadcrumbItem = document.createElement('button');
                breadcrumbItem.className = 'breadcrumb-item';
                breadcrumbItem.dataset.path = item.path;
                breadcrumbItem.textContent = item.name;
                container.appendChild(breadcrumbItem);
            });
        } else {
            // Root level
            const rootItem = document.createElement('button');
            rootItem.className = 'breadcrumb-item';
            rootItem.dataset.path = '';
            rootItem.textContent = 'All Folders';
            container.appendChild(rootItem);
        }
    }

    /**
     * Update visual state to show selected folder
     */
    updateSelectedState() {
        const selectedPath = this.folderStorage.getCurrentFolderPath();
        
        // Remove previous selection
        this.container.querySelectorAll('.folder-option.selected').forEach(el => {
            el.classList.remove('selected');
        });
        
        // Add selection to current folder
        const selectedElement = this.container.querySelector(`[data-path="${selectedPath}"]`);
        if (selectedElement) {
            selectedElement.classList.add('selected');
        }
    }

    /**
     * Show/hide loading state
     * @param {boolean} show - Whether to show loading
     */
    showLoading(show) {
        this.isLoading = show;
        const loading = this.container.querySelector('.folder-loading');
        const grid = this.container.querySelector('.folder-grid');
        
        if (loading) {
            loading.classList.toggle('hidden', !show);
        }
        if (grid) {
            grid.style.opacity = show ? '0.5' : '1';
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    showError(message) {
        const error = this.container.querySelector('.folder-error');
        const errorText = this.container.querySelector('.error-text');
        
        if (error) {
            error.classList.remove('hidden');
        }
        if (errorText) {
            errorText.textContent = message;
        }
    }

    /**
     * Hide error message
     */
    hideError() {
        const error = this.container.querySelector('.folder-error');
        if (error) {
            error.classList.add('hidden');
        }
    }

    /**
     * Get currently selected folder
     * @returns {Object} Current folder selection
     */
    getSelectedFolder() {
        return this.folderStorage.loadSelectedFolder();
    }

    /**
     * Refresh the current view
     */
    refresh() {
        this.loadCurrentFolder();
    }
}

// Export for use in other scripts
window.FolderBrowser = FolderBrowser;