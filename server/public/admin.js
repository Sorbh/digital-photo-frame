class PhotoFrameAdmin {
    constructor() {
        this.currentPath = 'uploads';
        this.selectedFiles = [];
        this.contextMenuTarget = null;
        this.initializeEventListeners();
        this.loadFolderContents();
    }

    initializeEventListeners() {
        // Navigation
        document.getElementById('backBtn').addEventListener('click', () => this.navigateBack());
        
        // Breadcrumb navigation
        document.getElementById('breadcrumbContainer').addEventListener('click', (e) => {
            if (e.target.classList.contains('breadcrumb-item')) {
                this.navigateTo(e.target.dataset.path);
            }
        });

        // Create folder
        document.getElementById('createFolderBtn').addEventListener('click', () => this.showCreateFolderModal());
        document.getElementById('confirmCreateBtn').addEventListener('click', () => this.createFolder());
        document.getElementById('cancelCreateBtn').addEventListener('click', () => this.hideCreateFolderModal());

        // Upload
        document.getElementById('uploadBtn').addEventListener('click', () => this.showUploadModal());
        document.getElementById('confirmUploadBtn').addEventListener('click', () => this.uploadFiles());
        document.getElementById('cancelUploadBtn').addEventListener('click', () => this.hideUploadModal());
        document.getElementById('uploadDropZone').addEventListener('click', () => document.getElementById('fileInput').click());

        // File input
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.selectedFiles = Array.from(e.target.files);
            this.updateUploadButton();
        });

        // Drag and drop for upload modal
        this.setupUploadDragAndDrop();
        
        // Main drop zone
        this.setupMainDragAndDrop();

        // Context menu
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#contextMenu')) {
                this.hideContextMenu();
            }
        });
        document.getElementById('contextMenu').addEventListener('click', (e) => {
            e.stopPropagation();
            if (e.target.closest('.menu-item')) {
                this.handleContextMenuAction(e.target.closest('.menu-item').dataset.action);
            }
        });

        // Folder name input enter key
        document.getElementById('folderNameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.createFolder();
            }
        });

        // Modal backdrop clicks
        document.getElementById('createFolderModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideCreateFolderModal();
            }
        });

        document.getElementById('uploadModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideUploadModal();
            }
        });
    }

    setupUploadDragAndDrop() {
        const dropZone = document.getElementById('uploadDropZone');
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            
            const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
            this.selectedFiles = files;
            this.updateUploadButton();
        });
    }

    setupMainDragAndDrop() {
        const mainContent = document.querySelector('.main-content');
        let dragCounter = 0;
        
        mainContent.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dragCounter++;
            document.getElementById('dropZone').classList.remove('hidden');
        });

        mainContent.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        mainContent.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dragCounter--;
            if (dragCounter === 0) {
                document.getElementById('dropZone').classList.add('hidden');
            }
        });

        mainContent.addEventListener('drop', (e) => {
            e.preventDefault();
            dragCounter = 0;
            document.getElementById('dropZone').classList.add('hidden');
            
            const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
            if (files.length > 0) {
                this.uploadFilesDirectly(files);
            }
        });
    }

    async loadFolderContents() {
        try {
            const response = await fetch(`/api/folders?path=${encodeURIComponent(this.currentPath)}`);
            const data = await response.json();
            
            if (response.ok) {
                this.renderFolderContents(data);
                this.updateBreadcrumb();
                this.updateBackButton();
            } else {
                this.showToast(data.message || 'Failed to load folder contents', 'error');
            }
        } catch (error) {
            console.error('Error loading folder contents:', error);
            this.showToast('Failed to load folder contents', 'error');
        }
    }

    renderFolderContents(data) {
        const fileGrid = document.getElementById('fileGrid');
        const emptyState = document.getElementById('emptyState');
        
        fileGrid.innerHTML = '';
        
        if (data.folders.length === 0 && data.files.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }
        
        emptyState.classList.add('hidden');
        
        // Render folders
        data.folders.forEach(folder => {
            const folderElement = this.createFolderElement(folder);
            fileGrid.appendChild(folderElement);
        });
        
        // Render files
        data.files.forEach(file => {
            const fileElement = this.createFileElement(file);
            fileGrid.appendChild(fileElement);
        });
    }

    createFolderElement(folder) {
        const div = document.createElement('div');
        div.className = 'file-item folder';
        div.dataset.path = folder.path;
        div.dataset.type = 'folder';
        div.innerHTML = `
            <span class="material-icons">folder</span>
            <span class="file-name">${folder.name}</span>
        `;
        
        div.addEventListener('click', () => this.navigateTo(folder.path));
        div.addEventListener('contextmenu', (e) => this.showContextMenu(e, {...folder, type: 'folder'}));
        
        return div;
    }

    createFileElement(file) {
        const div = document.createElement('div');
        div.className = 'file-item image';
        div.dataset.path = file.path;
        div.dataset.type = 'image';
        div.innerHTML = `
            <img src="${file.url}" alt="${file.name}" loading="lazy">
            <span class="file-name">${file.name}</span>
        `;
        
        div.addEventListener('contextmenu', (e) => this.showContextMenu(e, {...file, type: 'image'}));
        
        return div;
    }

    navigateTo(path) {
        this.currentPath = path;
        this.loadFolderContents();
    }

    navigateBack() {
        if (this.currentPath === 'uploads') return;
        
        const pathParts = this.currentPath.split('/');
        pathParts.pop();
        this.currentPath = pathParts.join('/') || 'uploads';
        this.loadFolderContents();
    }

    updateBreadcrumb() {
        const container = document.getElementById('breadcrumbContainer');
        const pathParts = this.currentPath.split('/');
        
        container.innerHTML = '';
        
        let currentPath = '';
        pathParts.forEach((part, index) => {
            if (index > 0) currentPath += '/';
            currentPath += part;
            
            const span = document.createElement('span');
            span.className = 'breadcrumb-item';
            span.dataset.path = currentPath;
            span.textContent = index === 0 ? 'Home' : part;
            
            container.appendChild(span);
        });
    }

    updateBackButton() {
        const backBtn = document.getElementById('backBtn');
        backBtn.style.display = this.currentPath === 'uploads' ? 'none' : 'flex';
    }

    showCreateFolderModal() {
        document.getElementById('createFolderModal').classList.remove('hidden');
        document.getElementById('folderNameInput').focus();
    }

    hideCreateFolderModal() {
        document.getElementById('createFolderModal').classList.add('hidden');
        document.getElementById('folderNameInput').value = '';
    }

    async createFolder() {
        const name = document.getElementById('folderNameInput').value.trim();
        
        if (!name) {
            this.showToast('Please enter a folder name', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/folders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name,
                    path: this.currentPath
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showToast('Folder created successfully', 'success');
                this.hideCreateFolderModal();
                this.loadFolderContents();
            } else {
                this.showToast(data.message || 'Failed to create folder', 'error');
            }
        } catch (error) {
            console.error('Error creating folder:', error);
            this.showToast('Failed to create folder', 'error');
        }
    }

    showUploadModal() {
        document.getElementById('uploadModal').classList.remove('hidden');
        this.selectedFiles = [];
        this.updateUploadButton();
    }

    hideUploadModal() {
        document.getElementById('uploadModal').classList.add('hidden');
        document.getElementById('fileInput').value = '';
        this.selectedFiles = [];
        this.hideUploadProgress();
    }

    updateUploadButton() {
        const btn = document.getElementById('confirmUploadBtn');
        btn.disabled = this.selectedFiles.length === 0;
        btn.textContent = this.selectedFiles.length > 0 ? 
            `Upload ${this.selectedFiles.length} file${this.selectedFiles.length > 1 ? 's' : ''}` : 
            'Upload';
    }

    async uploadFiles() {
        if (this.selectedFiles.length === 0) return;
        
        const formData = new FormData();
        this.selectedFiles.forEach(file => {
            formData.append('images', file);
        });
        formData.append('path', this.currentPath);
        
        this.showUploadProgress();
        
        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showToast(`${data.files.length} file(s) uploaded successfully`, 'success');
                this.hideUploadModal();
                this.loadFolderContents();
            } else {
                this.showToast(data.message || 'Upload failed', 'error');
            }
        } catch (error) {
            console.error('Error uploading files:', error);
            this.showToast('Upload failed', 'error');
        }
        
        this.hideUploadProgress();
    }

    showUploadProgress() {
        document.getElementById('uploadProgress').classList.remove('hidden');
        const progressFill = document.querySelector('.progress-fill');
        progressFill.style.width = '0%';
        
        // Simulate progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 20;
            if (progress > 90) progress = 90;
            progressFill.style.width = progress + '%';
            
            if (progress >= 90) {
                clearInterval(interval);
            }
        }, 200);
    }

    hideUploadProgress() {
        document.getElementById('uploadProgress').classList.add('hidden');
    }

    async uploadFilesDirectly(files) {
        if (files.length === 0) return;
        
        const formData = new FormData();
        files.forEach(file => {
            formData.append('images', file);
        });
        formData.append('path', this.currentPath);
        
        this.showToast(`Uploading ${files.length} file(s) to ${this.currentPath}...`, 'info');
        
        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showToast(`${data.files.length} file(s) uploaded successfully to ${this.currentPath}`, 'success');
                this.loadFolderContents();
            } else {
                this.showToast(data.message || 'Upload failed', 'error');
            }
        } catch (error) {
            console.error('Error uploading files:', error);
            this.showToast('Upload failed', 'error');
        }
    }

    showContextMenu(event, item) {
        event.preventDefault();
        console.log('Context menu triggered for:', item);
        console.log('Item type:', typeof item, 'Has name:', item?.name);
        
        this.contextMenuTarget = item;
        const menu = document.getElementById('contextMenu');
        
        menu.classList.remove('hidden');
        menu.style.left = event.pageX + 'px';
        menu.style.top = event.pageY + 'px';
        
        // Adjust position if menu goes off screen
        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            menu.style.left = (event.pageX - rect.width) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
            menu.style.top = (event.pageY - rect.height) + 'px';
        }
    }

    hideContextMenu() {
        document.getElementById('contextMenu').classList.add('hidden');
        this.contextMenuTarget = null;
    }

    async handleContextMenuAction(action) {
        console.log('Context menu action:', action, 'Target:', this.contextMenuTarget);
        if (!this.contextMenuTarget) return;
        
        // Store the target before hiding the menu
        const targetItem = this.contextMenuTarget;
        this.hideContextMenu();
        
        switch (action) {
            case 'delete':
                await this.deleteItem(targetItem);
                break;
        }
    }

    async deleteItem(item) {
        console.log('Attempting to delete item:', item);
        
        if (!item || !item.name) {
            console.error('Invalid item for deletion:', item);
            this.showToast('Cannot delete: Invalid item', 'error');
            return;
        }
        
        const confirmDelete = confirm(`Are you sure you want to delete "${item.name}"?`);
        if (!confirmDelete) return;
        
        try {
            const endpoint = item.type === 'folder' ? '/api/folders' : '/api/images';
            console.log('Delete endpoint:', endpoint, 'Path:', item.path);
            const response = await fetch(`${endpoint}?path=${encodeURIComponent(item.path)}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            console.log('Delete response:', data);
            
            if (response.ok) {
                this.showToast(`${item.type === 'folder' ? 'Folder' : 'Image'} deleted successfully`, 'success');
                this.loadFolderContents();
            } else {
                this.showToast(data.message || 'Delete failed', 'error');
            }
        } catch (error) {
            console.error('Error deleting item:', error);
            this.showToast('Delete failed', 'error');
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize the admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PhotoFrameAdmin();
});