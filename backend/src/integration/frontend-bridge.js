/**
 * VernWallet Bridge Frontend Integration Layer
 * Connects existing frontend to the new backend API
 */

class VernWalletBridge {
    constructor(config = {}) {
        this.config = {
            apiUrl: config.apiUrl || 'http://localhost:3001',
            websocketUrl: config.websocketUrl || 'ws://localhost:3001/ws',
            refreshInterval: config.refreshInterval || 30000,
            ...config
        };

        this.websocket = null;
        this.isConnected = false;
        this.subscriptions = new Set();
        this.eventListeners = new Map();

        this.initialize();
    }

    initialize() {
        this.connectWebSocket();
        this.startPeriodicUpdates();
        this.setupGlobalErrorHandler();
    }

    // WebSocket Connection Management
    connectWebSocket() {
        try {
            this.websocket = new WebSocket(this.config.websocketUrl);

            this.websocket.onopen = () => {
                this.isConnected = true;
                console.log('🔗 Connected to VernWallet Bridge WebSocket');
                this.emit('connected');

                // Resubscribe to channels
                this.subscriptions.forEach(channel => {
                    this.subscribe(channel);
                });
            };

            this.websocket.onclose = () => {
                this.isConnected = false;
                console.log('🔌 Disconnected from VernWallet Bridge WebSocket');
                this.emit('disconnected');

                // Attempt to reconnect after delay
                setTimeout(() => this.connectWebSocket(), 5000);
            };

            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.emit('error', error);
            };

            this.websocket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleWebSocketMessage(message);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };

        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
        }
    }

    handleWebSocketMessage(message) {
        switch (message.type) {
            case 'welcome':
                console.log('🖖 WebSocket welcome:', message.message);
                break;

            case 'broadcast':
                this.emit('broadcast', message);
                break;

            case 'subscribed':
                console.log(`📡 Subscribed to channel: ${message.channel}`);
                break;

            case 'unsubscribed':
                console.log(`📡 Unsubscribed from channel: ${message.channel}`);
                break;

            case 'pong':
                this.emit('pong', message);
                break;

            case 'error':
                console.error('WebSocket error message:', message.message);
                this.emit('error', message);
                break;

            default:
                this.emit('message', message);
        }
    }

    subscribe(channel) {
        if (this.isConnected && this.websocket) {
            this.websocket.send(JSON.stringify({
                type: 'subscribe',
                channel: channel
            }));
            this.subscriptions.add(channel);
        }
    }

    unsubscribe(channel) {
        if (this.isConnected && this.websocket) {
            this.websocket.send(JSON.stringify({
                type: 'unsubscribe',
                channel: channel
            }));
            this.subscriptions.delete(channel);
        }
    }

    // Event System
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    // API Request Methods
    async request(endpoint, options = {}) {
        try {
            const url = `${this.config.apiUrl}${endpoint}`;
            const config = {
                method: options.method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            };

            // Add authentication if available
            if (this.config.apiKey) {
                config.headers['X-API-Key'] = this.config.apiKey;
            }

            const response = await fetch(url, config);

            // Check if response is ok and has content
            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}`;

                try {
                    // Try to get error message from response body
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const errorData = await response.json();
                        errorMessage = errorData.error || errorMessage;
                    } else {
                        // For non-JSON responses, get text content
                        const textContent = await response.text();
                        if (textContent) {
                            errorMessage = textContent.substring(0, 200); // Limit error message length
                        }
                    }
                } catch (parseError) {
                    // If we can't parse the error response, use the status text
                    if (response.statusText) {
                        errorMessage = response.statusText;
                    }
                }

                throw new Error(errorMessage);
            }

            // Check if response has content before trying to parse JSON
            const contentType = response.headers.get('content-type');
            const contentLength = response.headers.get('content-length');

            // Handle empty responses (like 204 No Content)
            if (contentLength === '0' || (response.status === 204)) {
                return { success: true };
            }

            // Try to parse JSON response
            let data;
            try {
                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    // If content type is not JSON, try to parse as text first
                    const textContent = await response.text();
                    try {
                        data = JSON.parse(textContent);
                    } catch (jsonParseError) {
                        throw new Error(`Expected JSON response but got: ${textContent.substring(0, 100)}`);
                    }
                }
            } catch (parseError) {
                if (parseError.message.includes('Unexpected end of JSON input')) {
                    throw new Error('Server returned an empty or invalid JSON response');
                }
                throw new Error(`Failed to parse response as JSON: ${parseError.message}`);
            }

            return data;

        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Bridge Operations
    async initiateDeposit(btcTxHash, amount, starknetRecipient, confirmations = 6) {
        try {
            const response = await this.request('/api/bridge/deposit', {
                method: 'POST',
                body: JSON.stringify({
                    btcTxHash,
                    amount,
                    starknetRecipient,
                    confirmations
                })
            });

            this.emit('depositInitiated', response.data);
            return response;

        } catch (error) {
            this.emit('depositFailed', { error: error.message, btcTxHash, amount, starknetRecipient });
            throw error;
        }
    }

    async initiateWithdrawal(amount, btcRecipient, starknetSender) {
        try {
            const response = await this.request('/api/bridge/withdrawal', {
                method: 'POST',
                body: JSON.stringify({
                    amount,
                    btcRecipient,
                    starknetSender
                })
            });

            this.emit('withdrawalInitiated', response.data);
            return response;

        } catch (error) {
            this.emit('withdrawalFailed', { error: error.message, amount, btcRecipient, starknetSender });
            throw error;
        }
    }

    async getDepositStatus(btcTxHash) {
        try {
            const response = await this.request(`/api/bridge/deposit/${btcTxHash}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async getWithdrawalStatus(withdrawalId) {
        try {
            const response = await this.request(`/api/bridge/withdrawal/${withdrawalId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async getBridgeStats() {
        try {
            const response = await this.request('/api/bridge/stats');
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async getNetworkStatus() {
        try {
            const response = await this.request('/api/bridge/networks');
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async getSBTCBalance(address) {
        try {
            const response = await this.request(`/api/bridge/sbtc/balance/${address}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    // Real-time Updates
    startPeriodicUpdates() {
        // Update bridge stats every 30 seconds
        setInterval(async () => {
            try {
                const stats = await this.getBridgeStats();
                this.emit('statsUpdated', stats);
            } catch (error) {
                console.error('Failed to update bridge stats:', error);
            }
        }, this.config.refreshInterval);

        // Update network status every 15 seconds
        setInterval(async () => {
            try {
                const networks = await this.getNetworkStatus();
                this.emit('networkStatusUpdated', networks);
            } catch (error) {
                console.error('Failed to update network status:', error);
            }
        }, 15000);

        // Send periodic ping to keep WebSocket alive
        setInterval(() => {
            if (this.isConnected && this.websocket) {
                this.websocket.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000);
    }

    // Global Error Handler
    setupGlobalErrorHandler() {
        // Only set up browser-specific error handlers in browser environment
        if (typeof window !== 'undefined') {
            window.addEventListener('error', (event) => {
                console.error('Global error:', event.error);
                this.emit('globalError', event.error);
            });

            window.addEventListener('unhandledrejection', (event) => {
                console.error('Unhandled promise rejection:', event.reason);
                this.emit('globalError', event.reason);
            });
        } else {
            // Node.js error handling
            process.on('uncaughtException', (error) => {
                console.error('Uncaught Exception:', error);
                this.emit('globalError', error);
            });

            process.on('unhandledRejection', (reason, promise) => {
                console.error('Unhandled Rejection at:', promise, 'reason:', reason);
                this.emit('globalError', reason);
            });
        }
    }

    // Utility Methods
    formatAmount(amount, decimals = 8) {
        return parseFloat(amount).toFixed(decimals);
    }

    formatTimeAgo(timestamp) {
        const now = new Date();
        const diff = now - new Date(timestamp);
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    }

    isValidBitcoinAddress(address) {
        // Basic Bitcoin address validation
        return /^([13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59})$/.test(address);
    }

    isValidStarknetAddress(address) {
        // Basic Starknet address validation
        return /^0x[0-9a-fA-F]{64}$/.test(address);
    }

    // Configuration
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    // Health Check
    async healthCheck() {
        try {
            const response = await this.request('/api/bridge/health');
            return response.data;
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// Auto-initialize if not already present (browser only)
if (typeof window !== 'undefined' && !window.VernWalletBridge) {
    window.VernWalletBridge = VernWalletBridge;
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VernWalletBridge;
}