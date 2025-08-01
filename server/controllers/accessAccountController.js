const fs = require('fs').promises;
const path = require('path');

class AccessAccountController {
    constructor() {
        this.dataPath = path.join(__dirname, '../data');
        this.accountsFile = path.join(this.dataPath, 'access-accounts.json');
        this.initializeDataDirectory();
    }

    async initializeDataDirectory() {
        try {
            await fs.access(this.dataPath);
        } catch (error) {
            await fs.mkdir(this.dataPath, { recursive: true });
        }

        try {
            await fs.access(this.accountsFile);
        } catch (error) {
            await this.saveAccounts([]);
        }
    }

    async loadAccounts() {
        try {
            const data = await fs.readFile(this.accountsFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return [];
        }
    }

    async saveAccounts(accounts) {
        await fs.writeFile(this.accountsFile, JSON.stringify(accounts, null, 2));
    }

    generateAccountId() {
        return 'acc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async getAllAccounts(req, res) {
        try {
            const accounts = await this.loadAccounts();
            res.json({ accounts });
        } catch (error) {
            console.error('Error fetching accounts:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch accounts'
            });
        }
    }

    async createAccount(req, res) {
        try {
            const { name, pin, assignedFolders = [] } = req.body;

            if (!name || !pin) {
                return res.status(400).json({
                    success: false,
                    error: 'Name and PIN are required'
                });
            }

            const accounts = await this.loadAccounts();
            
            // Check for duplicate PIN
            const existingAccount = accounts.find(account => account.pin === pin);
            if (existingAccount) {
                return res.status(400).json({
                    success: false,
                    error: 'PIN already exists',
                    code: 'DUPLICATE_PIN'
                });
            }

            const newAccount = {
                id: this.generateAccountId(),
                name,
                pin,
                assignedFolders,
                createdAt: new Date().toISOString(),
                lastAccessed: null
            };

            accounts.push(newAccount);
            await this.saveAccounts(accounts);

            res.status(201).json({
                success: true,
                account: newAccount
            });
        } catch (error) {
            console.error('Error creating account:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create account'
            });
        }
    }

    async updateAccount(req, res) {
        try {
            const { id } = req.params;
            const { name, pin, assignedFolders = [] } = req.body;

            if (!name || !pin) {
                return res.status(400).json({
                    success: false,
                    error: 'Name and PIN are required'
                });
            }

            const accounts = await this.loadAccounts();
            const accountIndex = accounts.findIndex(account => account.id === id);

            if (accountIndex === -1) {
                return res.status(404).json({
                    success: false,
                    error: 'Account not found',
                    code: 'ACCOUNT_NOT_FOUND'
                });
            }

            // Check for duplicate PIN (excluding current account)
            const existingAccount = accounts.find(account => account.pin === pin && account.id !== id);
            if (existingAccount) {
                return res.status(400).json({
                    success: false,
                    error: 'PIN already exists',
                    code: 'DUPLICATE_PIN'
                });
            }

            accounts[accountIndex] = {
                ...accounts[accountIndex],
                name,
                pin,
                assignedFolders
            };

            await this.saveAccounts(accounts);

            res.json({
                success: true,
                account: accounts[accountIndex]
            });
        } catch (error) {
            console.error('Error updating account:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update account'
            });
        }
    }

    async deleteAccount(req, res) {
        try {
            const { id } = req.params;
            const accounts = await this.loadAccounts();
            const accountIndex = accounts.findIndex(account => account.id === id);

            if (accountIndex === -1) {
                return res.status(404).json({
                    success: false,
                    error: 'Account not found',
                    code: 'ACCOUNT_NOT_FOUND'
                });
            }

            accounts.splice(accountIndex, 1);
            await this.saveAccounts(accounts);

            res.json({
                success: true,
                message: 'Account deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting account:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete account'
            });
        }
    }

    async authenticateWithPin(req, res) {
        try {
            const { pin } = req.body;

            if (!pin) {
                return res.status(400).json({
                    success: false,
                    error: 'PIN is required'
                });
            }

            const accounts = await this.loadAccounts();
            const account = accounts.find(acc => acc.pin === pin);

            if (!account) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid PIN',
                    code: 'INVALID_PIN'
                });
            }

            // Update last accessed time
            account.lastAccessed = new Date().toISOString();
            await this.saveAccounts(accounts);

            // Store account info in session
            req.session.accessAccount = {
                id: account.id,
                name: account.name,
                assignedFolders: account.assignedFolders
            };

            res.json({
                success: true,
                account: {
                    id: account.id,
                    name: account.name,
                    assignedFolders: account.assignedFolders
                },
                sessionId: req.sessionID
            });
        } catch (error) {
            console.error('Error authenticating with PIN:', error);
            res.status(500).json({
                success: false,
                error: 'Authentication failed'
            });
        }
    }

    async getSession(req, res) {
        try {
            if (req.session.accessAccount) {
                res.json({
                    authenticated: true,
                    account: req.session.accessAccount
                });
            } else {
                res.json({
                    authenticated: false
                });
            }
        } catch (error) {
            console.error('Error checking session:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to check session'
            });
        }
    }

    async clearSession(req, res) {
        try {
            req.session.destroy((err) => {
                if (err) {
                    console.error('Error destroying session:', err);
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to clear session'
                    });
                }
                
                res.clearCookie('connect.sid'); // Default session cookie name
                res.json({
                    success: true,
                    message: 'Session cleared'
                });
            });
        } catch (error) {
            console.error('Error clearing session:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to clear session'
            });
        }
    }
}

module.exports = new AccessAccountController();