class AccessAccountsManager {
    constructor() {
        this.accounts = [];
        this.folders = [];
        this.currentEditingAccount = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadAccounts();
        this.loadFolders();
    }

    bindEvents() {
        // Back button
        document.getElementById('backBtn').addEventListener('click', () => {
            window.location.href = '/admin.html';
        });

        // Create new account button
        document.getElementById('createAccountBtn').addEventListener('click', () => {
            this.openAccountModal();
        });

        // Modal events
        document.getElementById('cancelAccountBtn').addEventListener('click', () => {
            this.closeAccountModal();
        });

        document.getElementById('accountForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveAccount();
        });

        // Delete modal events
        document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
            this.closeDeleteModal();
        });

        document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
            this.deleteAccount();
        });

        // Form validation
        document.getElementById('accountPin').addEventListener('input', (e) => {
            this.validatePin(e.target.value);
        });

        document.getElementById('accountName').addEventListener('input', (e) => {
            this.validateName(e.target.value);
        });

        // Close modals on outside click
        document.getElementById('accountModal').addEventListener('click', (e) => {
            if (e.target.id === 'accountModal') {
                this.closeAccountModal();
            }
        });

        document.getElementById('deleteModal').addEventListener('click', (e) => {
            if (e.target.id === 'deleteModal') {
                this.closeDeleteModal();
            }
        });
    }

    async loadAccounts() {
        try {
            this.showLoading();
            const response = await fetch('/api/access-accounts');
            const data = await response.json();
            
            if (response.ok) {
                this.accounts = data.accounts || [];
                this.renderAccounts();
            } else {
                this.showToast('Failed to load accounts', 'error');
                this.showEmptyState();
            }
        } catch (error) {
            console.error('Error loading accounts:', error);
            this.showToast('Failed to load accounts', 'error');
            this.showEmptyState();
        }
    }

    async loadFolders() {
        try {
            const response = await fetch('/api/folders');
            const data = await response.json();
            
            if (response.ok && data.folders) {
                this.folders = data.folders.map(folder => ({
                    name: folder.name,
                    path: folder.path || folder.name,
                    imageCount: folder.imageCount || 0
                }));
            } else {
                this.folders = [];
            }
        } catch (error) {
            console.error('Error loading folders:', error);
            this.folders = [];
        }
    }

    showLoading() {
        document.getElementById('loadingState').classList.remove('hidden');
        document.getElementById('accountsList').classList.add('hidden');
        document.getElementById('emptyState').classList.add('hidden');
    }

    showEmptyState() {
        document.getElementById('loadingState').classList.add('hidden');
        document.getElementById('accountsList').classList.add('hidden');
        document.getElementById('emptyState').classList.remove('hidden');
    }

    renderAccounts() {
        document.getElementById('loadingState').classList.add('hidden');
        
        if (this.accounts.length === 0) {
            this.showEmptyState();
            return;
        }

        document.getElementById('emptyState').classList.add('hidden');
        const accountsList = document.getElementById('accountsList');
        accountsList.classList.remove('hidden');
        
        accountsList.innerHTML = this.accounts.map(account => this.renderAccountCard(account)).join('');
        
        // Bind account action events
        this.bindAccountActions();
    }

    renderAccountCard(account) {
        const folderTags = account.assignedFolders.length > 0 
            ? account.assignedFolders.map(folder => 
                `<span class="folder-tag">
                    <span class="material-icons">folder</span>
                    ${folder}
                </span>`).join('')
            : '<span class="folder-tag no-folders-tag">No folders assigned</span>';

        const lastAccessed = account.lastAccessed 
            ? new Date(account.lastAccessed).toLocaleDateString()
            : 'Never';

        return `
            <div class="account-card" data-account-id="${account.id}">
                <div class="account-header">
                    <div class="account-info">
                        <h3 class="account-name">${account.name}</h3>
                        <div class="account-meta">
                            <div class="meta-item">
                                <span class="material-icons">key</span>
                                PIN: ${account.pin}
                            </div>
                            <div class="meta-item">
                                <span class="material-icons">folder</span>
                                ${account.assignedFolders.length} folders
                            </div>
                            <div class="meta-item">
                                <span class="material-icons">access_time</span>
                                Last used: ${lastAccessed}
                            </div>
                        </div>
                    </div>
                    <div class="account-actions">
                        <button class="btn-icon-small edit-account" title="Edit Account" data-account-id="${account.id}">
                            <span class="material-icons">edit</span>
                        </button>
                        <button class="btn-icon-small danger delete-account" title="Delete Account" data-account-id="${account.id}">
                            <span class="material-icons">delete</span>
                        </button>
                    </div>
                </div>
                <div class="folder-tags">
                    ${folderTags}
                </div>
            </div>
        `;
    }

    bindAccountActions() {
        // Edit account buttons
        document.querySelectorAll('.edit-account').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const accountId = e.currentTarget.getAttribute('data-account-id');
                this.editAccount(accountId);
            });
        });

        // Delete account buttons
        document.querySelectorAll('.delete-account').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const accountId = e.currentTarget.getAttribute('data-account-id');
                this.confirmDeleteAccount(accountId);
            });
        });
    }

    openAccountModal(account = null) {
        this.currentEditingAccount = account;
        const modal = document.getElementById('accountModal');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('accountForm');
        
        if (account) {
            title.textContent = 'Edit Access Account';
            document.getElementById('accountName').value = account.name;
            document.getElementById('accountPin').value = account.pin;
        } else {
            title.textContent = 'Create Access Account';
            form.reset();
        }

        this.clearErrors();
        this.renderFolderGrid(account ? account.assignedFolders : []);
        modal.classList.remove('hidden');
        document.getElementById('accountName').focus();
    }

    closeAccountModal() {
        document.getElementById('accountModal').classList.add('hidden');
        this.currentEditingAccount = null;
    }

    renderFolderGrid(selectedFolders = []) {
        const loadingElement = document.getElementById('loadingFolders');
        const gridElement = document.getElementById('folderGrid');
        
        if (this.folders.length === 0) {
            loadingElement.classList.remove('hidden');
            gridElement.classList.add('hidden');
            return;
        }

        loadingElement.classList.add('hidden');
        gridElement.classList.remove('hidden');
        
        gridElement.innerHTML = this.folders.map(folder => {
            const isSelected = selectedFolders.includes(folder.name);
            return `
                <div class="folder-checkbox ${isSelected ? 'selected' : ''}" data-folder="${folder.name}">
                    <input type="checkbox" 
                           id="folder-${folder.name}" 
                           value="${folder.name}" 
                           ${isSelected ? 'checked' : ''}>
                    <label for="folder-${folder.name}" class="folder-checkbox-label">
                        <span class="material-icons">folder</span>
                        ${folder.name}
                        <span class="folder-count">${folder.imageCount}</span>
                    </label>
                </div>
            `;
        }).join('');

        // Bind folder checkbox events
        gridElement.querySelectorAll('.folder-checkbox').forEach(checkbox => {
            checkbox.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    const input = checkbox.querySelector('input[type="checkbox"]');
                    input.checked = !input.checked;
                }
                
                if (checkbox.querySelector('input[type="checkbox"]').checked) {
                    checkbox.classList.add('selected');
                } else {
                    checkbox.classList.remove('selected');
                }
            });
        });
    }

    async saveAccount() {
        if (!this.validateForm()) {
            return;
        }

        const formData = new FormData(document.getElementById('accountForm'));
        const selectedFolders = Array.from(document.querySelectorAll('#folderGrid input[type="checkbox"]:checked'))
            .map(input => input.value);

        const accountData = {
            name: formData.get('name'),
            pin: formData.get('pin'),
            assignedFolders: selectedFolders
        };

        try {
            const url = this.currentEditingAccount 
                ? `/api/access-accounts/${this.currentEditingAccount.id}`
                : '/api/access-accounts';
            
            const method = this.currentEditingAccount ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(accountData)
            });

            const data = await response.json();

            if (response.ok) {
                this.showToast(
                    this.currentEditingAccount ? 'Account updated successfully' : 'Account created successfully',
                    'success'
                );
                this.closeAccountModal();
                this.loadAccounts();
            } else {
                if (data.code === 'DUPLICATE_PIN') {
                    this.showError('pinError', 'This PIN is already in use');
                } else {
                    this.showToast(data.error || 'Failed to save account', 'error');
                }
            }
        } catch (error) {
            console.error('Error saving account:', error);
            this.showToast('Failed to save account', 'error');
        }
    }

    editAccount(accountId) {
        const account = this.accounts.find(acc => acc.id === accountId);
        if (account) {
            this.openAccountModal(account);
        }
    }

    confirmDeleteAccount(accountId) {
        const account = this.accounts.find(acc => acc.id === accountId);
        if (account) {
            document.getElementById('deleteAccountName').textContent = account.name;
            document.getElementById('confirmDeleteBtn').setAttribute('data-account-id', accountId);
            document.getElementById('deleteModal').classList.remove('hidden');
        }
    }

    async deleteAccount() {
        const accountId = document.getElementById('confirmDeleteBtn').getAttribute('data-account-id');
        
        try {
            const response = await fetch(`/api/access-accounts/${accountId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showToast('Account deleted successfully', 'success');
                this.closeDeleteModal();
                this.loadAccounts();
            } else {
                const data = await response.json();
                this.showToast(data.error || 'Failed to delete account', 'error');
            }
        } catch (error) {
            console.error('Error deleting account:', error);
            this.showToast('Failed to delete account', 'error');
        }
    }

    closeDeleteModal() {
        document.getElementById('deleteModal').classList.add('hidden');
    }

    validateForm() {
        const name = document.getElementById('accountName').value.trim();
        const pin = document.getElementById('accountPin').value.trim();
        
        let isValid = true;

        if (!this.validateName(name)) {
            isValid = false;
        }

        if (!this.validatePin(pin)) {
            isValid = false;
        }

        return isValid;
    }

    validateName(name) {
        const nameInput = document.getElementById('accountName');
        const errorElement = document.getElementById('nameError');
        
        if (!name) {
            this.showError('nameError', 'Account name is required');
            nameInput.classList.add('error');
            return false;
        }
        
        if (name.length > 50) {
            this.showError('nameError', 'Account name must be 50 characters or less');
            nameInput.classList.add('error');
            return false;
        }

        this.clearError('nameError');
        nameInput.classList.remove('error');
        return true;
    }

    validatePin(pin) {
        const pinInput = document.getElementById('accountPin');
        const errorElement = document.getElementById('pinError');
        
        if (!pin) {
            this.showError('pinError', 'PIN is required');
            pinInput.classList.add('error');
            return false;
        }
        
        if (!/^[0-9]{4,6}$/.test(pin)) {
            this.showError('pinError', 'PIN must be 4-6 digits');
            pinInput.classList.add('error');
            return false;
        }

        this.clearError('pinError');
        pinInput.classList.remove('error');
        return true;
    }

    showError(elementId, message) {
        document.getElementById(elementId).textContent = message;
    }

    clearError(elementId) {
        document.getElementById(elementId).textContent = '';
    }

    clearErrors() {
        this.clearError('nameError');
        this.clearError('pinError');
        document.getElementById('accountName').classList.remove('error');
        document.getElementById('accountPin').classList.remove('error');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="material-icons">
                ${type === 'error' ? 'error' : type === 'success' ? 'check_circle' : 'info'}
            </span>
            <span class="toast-message">${message}</span>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                container.removeChild(toast);
            }, 300);
        }, 3000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AccessAccountsManager();
});