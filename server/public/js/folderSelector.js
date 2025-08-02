/**
 * Folder Selector Widget - Compact folder selector for slideshow page
 */
class FolderSelector {
    constructor(container, options = {}) {
        this.container = container;
        this.folderService = new FolderService();
        this.folderStorage = new FolderStorage();
        
        // Configuration options
        this.options = {
            onFolderChanged: options.onFolderChanged || null,
            showFolderCount: options.showFolderCount !== false,
            autoClose: options.autoClose !== false,
            ...options
        };
        
        // State
        this.isOpen = false;
        this.folders = [];
        this.isLoading = false;
        this.expandedFolders = new Set(); // Track expanded folders
        this.loadedSubfolders = new Map(); // Cache loaded subfolders
        
        this.initializeComponent();
        this.loadFolders();
        this.updateCurrentSelection();
    }

    /**
     * Initialize the component HTML structure
     */
    initializeComponent() {
        this.container.innerHTML = `
            <div class="folder-selector">
                <button class="folder-selector-btn" title="Select folder for slideshow">
                    <span class="material-icons">folder</span>
                    <span class="selected-folder-name">All Folders</span>
                    <span class="material-icons dropdown-arrow">keyboard_arrow_down</span>
                </button>
                
                <div class="folder-dropdown hidden">
                    <div class="folder-dropdown-header">
                        <span>Select Folder</span>
                        <button class="close-dropdown">
                            <span class="material-icons">close</span>
                        </button>
                    </div>
                    
                    <div class="folder-options">
                        <div class="folder-option all-folders" data-path="">
                            <div class="folder-option-content">
                                <div class="folder-spacer"></div>
                                <span class="material-icons folder-icon">photo_library</span>
                                <div class="folder-details">
                                    <div class="folder-name">All Folders</div>
                                    <div class="folder-count">All images</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="folder-list">
                            <!-- Folders will be loaded here -->
                        </div>
                    </div>
                    
                    <div class="folder-loading">
                        <div class="loading-spinner"></div>
                        <span>Loading folders...</span>
                    </div>
                    
                    <div class="folder-error hidden">
                        <span class="material-icons">error</span>
                        <span class="error-text">Failed to load folders</span>
                        <button class="retry-btn">Retry</button>
                    </div>
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
        // Toggle dropdown
        const selectorBtn = this.container.querySelector('.folder-selector-btn');
        selectorBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleDropdown();
        });

        // Close dropdown
        const closeBtn = this.container.querySelector('.close-dropdown');
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.closeDropdown();
        });

        // Folder selection and expansion
        this.container.addEventListener('click', (e) => {
            // Handle expand/collapse button
            const expandBtn = e.target.closest('.expand-btn');
            if (expandBtn) {
                e.preventDefault();
                e.stopPropagation();
                const folderOption = expandBtn.closest('.folder-option');
                const folderPath = folderOption.dataset.path;
                this.toggleFolderExpansion(folderPath);
                return;
            }

            // Handle folder selection
            const folderOption = e.target.closest('.folder-option');
            if (folderOption && !e.target.closest('.close-dropdown')) {
                e.preventDefault();
                const folderPath = folderOption.dataset.path;
                const folderName = folderOption.querySelector('.folder-name')?.textContent || '';
                this.selectFolder(folderPath, folderName);
            }

            // Retry button
            const retryBtn = e.target.closest('.retry-btn');
            if (retryBtn) {
                e.preventDefault();
                this.loadFolders();
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.closeDropdown();
            }
        });

        // Close dropdown on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeDropdown();
            }
        });
    }

    /**
     * Add component styles
     */
    addStyles() {
        if (document.getElementById('folder-selector-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'folder-selector-styles';
        styles.textContent = `
            .folder-selector {
                position: relative;
                display: inline-block;
            }

            .folder-selector-btn {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                padding: 8px 12px;
                border-radius: 20px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
                transition: all 0.3s ease;
                backdrop-filter: blur(10px);
                min-width: 120px;
                max-width: 200px;
            }

            .folder-selector-btn:hover {
                background: rgba(255, 255, 255, 0.3);
            }

            .selected-folder-name {
                flex: 1;
                text-align: left;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .dropdown-arrow {
                font-size: 18px;
                transition: transform 0.3s ease;
            }

            .folder-selector.open .dropdown-arrow {
                transform: rotate(180deg);
            }

            .folder-dropdown {
                position: absolute;
                top: 100%;
                right: 0;
                width: 280px;
                max-height: 400px;
                background: rgba(0, 0, 0, 0.9);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                backdrop-filter: blur(20px);
                z-index: 1000;
                margin-top: 8px;
                overflow: hidden;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            }

            .folder-dropdown.hidden {
                display: none;
            }

            .folder-dropdown-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 16px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                color: white;
                font-weight: 500;
            }

            .close-dropdown {
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.7);
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: color 0.2s;
            }

            .close-dropdown:hover {
                color: white;
                background: rgba(255, 255, 255, 0.1);
            }

            .folder-options {
                max-height: 300px;
                overflow-y: auto;
            }

            .folder-options::-webkit-scrollbar {
                width: 6px;
            }

            .folder-options::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.1);
            }

            .folder-options::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.3);
                border-radius: 3px;
            }

            .folder-option {
                display: block;
                cursor: pointer;
                transition: background 0.2s;
                color: white;
            }
            
            .folder-option-content {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 16px;
                transition: background 0.2s;
            }
            
            .expand-btn {
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.7);
                cursor: pointer;
                padding: 2px;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
                transition: all 0.2s;
                flex-shrink: 0;
            }
            
            .expand-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                color: white;
            }
            
            .expand-btn .material-icons {
                font-size: 18px;
            }
            
            .folder-spacer {
                width: 24px;
                height: 24px;
                flex-shrink: 0;
            }

            .folder-option:hover .folder-option-content {
                background: rgba(255, 255, 255, 0.1);
            }

            .folder-option.selected .folder-option-content {
                background: rgba(76, 175, 80, 0.2);
                border-left: 3px solid #4CAF50;
            }

            .folder-option.all-folders .folder-option-content {
                background: rgba(33, 150, 243, 0.1);
            }

            .folder-option.all-folders:hover .folder-option-content {
                background: rgba(33, 150, 243, 0.2);
            }

            .folder-option .folder-icon {
                font-size: 20px;
                color: rgba(255, 255, 255, 0.7);
                flex-shrink: 0;
            }

            .folder-option.all-folders .folder-icon {
                color: #2196F3;
            }

            .folder-details {
                flex: 1;
                min-width: 0;
                margin-left: 4px;
            }

            .folder-name {
                font-size: 14px;
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .folder-count {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.6);
                margin-top: 2px;
            }

            .folder-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                padding: 20px;
                color: rgba(255, 255, 255, 0.7);
            }

            .loading-spinner {
                width: 16px;
                height: 16px;
                border: 2px solid rgba(255, 255, 255, 0.2);
                border-top: 2px solid #fff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .folder-error {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                padding: 20px;
                color: #ff6b6b;
                text-align: center;
            }
            
            .folder-error.hidden {
                display: none;
            }

            .folder-error .material-icons {
                font-size: 24px;
            }

            .retry-btn {
                background: #ff6b6b;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
            }

            .retry-btn:hover {
                background: #ff5252;
            }

            /* Nested folder visual enhancements */
            .folder-option[data-level="1"] .folder-option-content {
                background: rgba(255, 255, 255, 0.02);
            }
            
            .folder-option[data-level="2"] .folder-option-content {
                background: rgba(255, 255, 255, 0.04);
            }
            
            .folder-option[data-level="3"] .folder-option-content {
                background: rgba(255, 255, 255, 0.06);
            }
            
            .folder-option:hover[data-level="1"] .folder-option-content {
                background: rgba(255, 255, 255, 0.12);
            }
            
            .folder-option:hover[data-level="2"] .folder-option-content {
                background: rgba(255, 255, 255, 0.14);
            }
            
            .folder-option:hover[data-level="3"] .folder-option-content {
                background: rgba(255, 255, 255, 0.16);
            }

            @media (max-width: 600px) {
                .folder-dropdown {
                    width: 250px;
                    right: -50px;
                }

                .folder-selector-btn {
                    min-width: 100px;
                    max-width: 150px;
                    font-size: 12px;
                    padding: 6px 10px;
                }
                
                .folder-option-content {
                    padding: 10px 12px;
                }
                
                .expand-btn {
                    width: 20px;
                    height: 20px;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    /**
     * Toggle dropdown open/closed
     */
    toggleDropdown() {
        if (this.isOpen) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }

    /**
     * Open dropdown
     */
    openDropdown() {
        this.isOpen = true;
        this.container.classList.add('open');
        this.container.querySelector('.folder-dropdown').classList.remove('hidden');
        
        // Load folders if not already loaded
        if (this.folders.length === 0 && !this.isLoading) {
            this.loadFolders();
        }
    }

    /**
     * Close dropdown
     */
    closeDropdown() {
        this.isOpen = false;
        this.container.classList.remove('open');
        this.container.querySelector('.folder-dropdown').classList.add('hidden');
    }

    /**
     * Load folders from API
     */
    async loadFolders() {
        if (this.isLoading) return;
        
        this.showLoading(true);
        this.hideError();
        
        try {
            const data = await this.folderService.getFolderStructure();
            this.folders = data.folders || [];
            this.renderFolders();
            this.updateSelectedState();
        } catch (error) {
            console.error('Error loading folders:', error);
            this.showError(error.message);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Render folders in dropdown
     */
    renderFolders() {
        const list = this.container.querySelector('.folder-list');
        if (!list) return;

        list.innerHTML = '';
        this.renderFolderLevel(this.folders, list, 0);
    }

    /**
     * Render folders at a specific level with indentation
     * @param {Array} folders - Folders to render
     * @param {Element} container - Container to append to
     * @param {number} level - Nesting level for indentation
     */
    renderFolderLevel(folders, container, level) {
        folders.forEach(folder => {
            const element = document.createElement('div');
            element.className = 'folder-option';
            element.dataset.path = folder.path;
            element.dataset.level = level;
            
            const isExpanded = this.expandedFolders.has(folder.path);
            const hasSubfolders = folder.hasSubfolders;
            const indentPadding = level * 20; // 20px per level
            
            element.innerHTML = `
                <div class="folder-option-content" style="padding-left: ${indentPadding}px;">
                    ${hasSubfolders ? 
                        `<button class="expand-btn" data-expanded="${isExpanded}">
                            <span class="material-icons">${isExpanded ? 'keyboard_arrow_down' : 'keyboard_arrow_right'}</span>
                        </button>` : 
                        `<div class="folder-spacer"></div>`
                    }
                    <span class="material-icons folder-icon">folder</span>
                    <div class="folder-details">
                        <div class="folder-name">${folder.name}</div>
                        ${this.options.showFolderCount ? `<div class="folder-count">${folder.imageCount} images</div>` : ''}
                    </div>
                </div>
            `;

            container.appendChild(element);
            
            // Render subfolders if expanded
            if (isExpanded && this.loadedSubfolders.has(folder.path)) {
                const subfolders = this.loadedSubfolders.get(folder.path);
                this.renderFolderLevel(subfolders, container, level + 1);
            }
        });
    }

    /**
     * Select a folder
     * @param {string} folderPath - Selected folder path
     * @param {string} folderName - Display name of selected folder
     */
    selectFolder(folderPath, folderName) {
        console.log('🎯 Folder selected:', folderPath, folderName);
        
        // Save selection
        this.folderStorage.saveSelectedFolder(folderPath, folderName);
        
        // Verify it was saved
        const saved = this.folderStorage.getCurrentFolderPath();
        console.log('💾 Saved folder path:', saved);
        
        // Update display
        this.updateCurrentSelection();
        this.updateSelectedState();
        
        // Close dropdown if auto-close is enabled
        if (this.options.autoClose) {
            this.closeDropdown();
        }
        
        // Trigger callback
        if (this.options.onFolderChanged) {
            console.log('🔄 Triggering onFolderChanged callback');
            this.options.onFolderChanged(folderPath, folderName);
        }
    }

    /**
     * Update current selection display
     */
    updateCurrentSelection() {
        const selectedFolder = this.folderStorage.loadSelectedFolder();
        const nameElement = this.container.querySelector('.selected-folder-name');
        
        if (nameElement) {
            nameElement.textContent = selectedFolder ? selectedFolder.name : 'All Folders';
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
            
            // Auto-expand parent folders if needed
            this.expandParentFolders(selectedPath);
        }
    }
    
    /**
     * Expand parent folders to show selected nested folder
     * @param {string} folderPath - Path of selected folder
     */
    async expandParentFolders(folderPath) {
        if (!folderPath) return;
        
        const pathParts = folderPath.split('/');
        let currentPath = '';
        
        // Expand each parent folder in the path
        for (let i = 0; i < pathParts.length - 1; i++) {
            currentPath = currentPath ? `${currentPath}/${pathParts[i]}` : pathParts[i];
            
            if (!this.expandedFolders.has(currentPath)) {
                this.expandedFolders.add(currentPath);
                
                // Load subfolders if not already loaded
                if (!this.loadedSubfolders.has(currentPath)) {
                    await this.loadSubfolders(currentPath);
                }
            }
        }
        
        // Re-render to show expanded folders
        this.renderFolders();
    }

    /**
     * Show/hide loading state
     * @param {boolean} show - Whether to show loading
     */
    showLoading(show) {
        this.isLoading = show;
        const loading = this.container.querySelector('.folder-loading');
        const options = this.container.querySelector('.folder-options');
        
        if (loading) {
            loading.style.display = show ? 'flex' : 'none';
        }
        if (options) {
            options.style.display = show ? 'none' : 'block';
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    showError(message) {
        const error = this.container.querySelector('.folder-error');
        const errorText = this.container.querySelector('.error-text');
        const loading = this.container.querySelector('.folder-loading');
        const options = this.container.querySelector('.folder-options');
        
        if (error) {
            error.classList.remove('hidden');
        }
        if (errorText) {
            errorText.textContent = message;
        }
        if (loading) {
            loading.style.display = 'none';
        }
        if (options) {
            options.style.display = 'none';
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
     * Toggle folder expansion
     * @param {string} folderPath - Path of folder to toggle
     */
    async toggleFolderExpansion(folderPath) {
        const isExpanded = this.expandedFolders.has(folderPath);
        
        if (isExpanded) {
            // Collapse folder
            this.expandedFolders.delete(folderPath);
            this.renderFolders();
        } else {
            // Expand folder
            this.expandedFolders.add(folderPath);
            
            // Load subfolders if not already loaded
            if (!this.loadedSubfolders.has(folderPath)) {
                await this.loadSubfolders(folderPath);
            }
            
            this.renderFolders();
        }
    }
    
    /**
     * Load subfolders for a specific folder
     * @param {string} folderPath - Path of folder to load subfolders for
     */
    async loadSubfolders(folderPath) {
        try {
            const data = await this.folderService.getFolderStructure(folderPath);
            const subfolders = data.subfolders || [];
            this.loadedSubfolders.set(folderPath, subfolders);
        } catch (error) {
            console.error('Error loading subfolders:', error);
            // Remove from expanded set if loading failed
            this.expandedFolders.delete(folderPath);
        }
    }
    
    /**
     * Find if a folder path exists in the current folder list
     * @param {string} folderPath - Path to search for
     * @returns {boolean} True if folder exists
     */
    findFolderInList(folderPath) {
        if (!folderPath) return true; // "All Folders" always exists
        
        const searchInFolders = (folders) => {
            for (const folder of folders) {
                if (folder.path === folderPath) return true;
                if (folder.subfolders && searchInFolders(folder.subfolders)) return true;
            }
            return false;
        };
        
        return searchInFolders(this.folders);
    }

    /**
     * Refresh the folder list while preserving current selection
     */
    async refresh() {
        // Save current selection before refresh
        const currentSelection = this.folderStorage.loadSelectedFolder();
        
        this.folders = [];
        this.expandedFolders.clear();
        this.loadedSubfolders.clear();
        
        try {
            // Load folders (this already calls updateSelectedState)
            await this.loadFolders();
            
            // After loading, verify the selection is still valid
            if (currentSelection && currentSelection.path) {
                const folderExists = this.findFolderInList(currentSelection.path);
                if (!folderExists) {
                    // Selected folder no longer exists, reset to "All Folders"
                    console.log('Previously selected folder no longer available, resetting to All Folders');
                    this.folderStorage.saveSelectedFolder('', 'All Folders');
                    this.updateCurrentSelection();
                    this.updateSelectedState();
                }
            }
        } catch (error) {
            console.error('Error refreshing folders:', error);
        }
    }
}

// Export for use in other scripts
window.FolderSelector = FolderSelector;