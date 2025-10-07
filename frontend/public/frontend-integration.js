/**
 * Frontend Integration Service
 * Handles all frontend-backend communication for wallet features
 * Connects to Cairo StarkNet smart contracts through the backend API
 */

class VernWalletIntegration {
    constructor(config = {}) {
        this.config = {
            apiUrl: config.apiUrl || 'http://127.0.0.1:3001',
            websocketUrl: config.websocketUrl || 'ws://localhost:3001/ws',
            ...config
        };

        this.websocket = null;
        this.isConnected = false;
        this.connectedWallets = new Map();
        this.activeWallet = null;
        this.eventListeners = new Map();
        this.requestQueue = [];
        this.isProcessingQueue = false;

        this.initializeWebSocket();
    }

    // WebSocket Management
    initializeWebSocket() {
        try {
            this.websocket = new WebSocket(this.config.websocketUrl);

            this.websocket.onopen = () => {
                this.isConnected = true;
                console.log('🔗 Connected to VernWallet WebSocket');
                this.emit('connected');
                this.processRequestQueue();
            };

            this.websocket.onclose = () => {
                this.isConnected = false;
                console.log('🔌 Disconnected from VernWallet WebSocket');
                this.emit('disconnected');

                // Attempt to reconnect after delay
                setTimeout(() => this.initializeWebSocket(), 5000);
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
            console.error('Failed to initialize WebSocket:', error);
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

            case 'error':
                console.error('WebSocket error message:', message.message);
                this.emit('error', message);
                break;

            default:
                this.emit('message', message);
        }
    }

    // Event System
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
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

    // API Request Helper
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

            if (options.body && typeof options.body === 'object') {
                config.body = JSON.stringify(options.body);
            }

            const response = await fetch(url, config);

            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}`;

                try {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const errorData = await response.json();
                        errorMessage = errorData.error || errorMessage;
                    } else {
                        const textContent = await response.text();
                        if (textContent) {
                            errorMessage = textContent.substring(0, 200);
                        }
                    }
                } catch (parseError) {
                    if (response.statusText) {
                        errorMessage = response.statusText;
                    }
                }

                throw new Error(errorMessage);
            }

            const contentType = response.headers.get('content-type');
            const contentLength = response.headers.get('content-length');

            if (contentLength === '0' || (response.status === 204)) {
                return { success: true };
            }

            let data;
            try {
                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else {
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

    // Queue management for offline requests
    addToQueue(endpoint, options) {
        this.requestQueue.push({ endpoint, options, timestamp: Date.now() });
    }

    async processRequestQueue() {
        if (this.isProcessingQueue || !this.isConnected || this.requestQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;

        while (this.requestQueue.length > 0 && this.isConnected) {
            const { endpoint, options } = this.requestQueue.shift();

            try {
                await this.request(endpoint, options);
            } catch (error) {
                console.error('Queued request failed:', error);
                // Re-queue if it's a critical request
                if (options.critical) {
                    this.requestQueue.unshift({ endpoint, options, timestamp: Date.now() });
                }
            }

            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.isProcessingQueue = false;
    }

    // Wallet Connection Methods
    async connectStarknetWallet(walletType, credentials = {}) {
        try {
            const response = await this.request('/api/wallet/connect/starknet', {
                method: 'POST',
                body: { walletType, credentials }
            });

            if (response.success) {
                this.connectedWallets.set(response.data.address, {
                    type: walletType,
                    address: response.data.address,
                    name: response.data.name,
                    connectedAt: new Date()
                });

                this.activeWallet = response.data.address;
                this.emit('walletConnected', response.data);
            }

            return response;

        } catch (error) {
            console.error('Starknet wallet connection failed:', error);
            throw error;
        }
    }

    async disconnectWallet(address) {
        try {
            const response = await this.request('/api/wallet/disconnect', {
                method: 'POST',
                body: { address }
            });

            if (response.success) {
                this.connectedWallets.delete(address);
                if (this.activeWallet === address) {
                    this.activeWallet = null;
                }
                this.emit('walletDisconnected', { address });
            }

            return response;

        } catch (error) {
            console.error('Wallet disconnection failed:', error);
            throw error;
        }
    }

    getConnectedWallets() {
        return Array.from(this.connectedWallets.values());
    }

    getActiveWallet() {
        return this.activeWallet ? this.connectedWallets.get(this.activeWallet) : null;
    }

    // Enhanced Bridge Operations with Contract Integration
    async initiateBridgeTransfer(params) {
        try {
            const {
                direction,
                amount,
                fromAddress,
                toAddress,
                walletAddress
            } = params;

            // Enhanced validation
            if (!amount || amount <= 0) {
                throw new Error('Invalid amount specified');
            }

            if (!fromAddress || !toAddress) {
                throw new Error('Source and destination addresses are required');
            }

            // Validate addresses based on direction
            if (direction === 'bitcoin-to-starknet') {
                if (!this.validateBitcoinAddress(fromAddress)) {
                    throw new Error('Invalid Bitcoin source address');
                }
                if (!this.validateStarknetAddress(toAddress)) {
                    throw new Error('Invalid Starknet destination address');
                }
            } else if (direction === 'starknet-to-bitcoin') {
                if (!this.validateStarknetAddress(fromAddress)) {
                    throw new Error('Invalid Starknet source address');
                }
                if (!this.validateBitcoinAddress(toAddress)) {
                    throw new Error('Invalid Bitcoin destination address');
                }
            } else {
                throw new Error('Invalid bridge direction');
            }

            let endpoint, body;

            if (direction === 'bitcoin-to-starknet') {
                endpoint = '/api/bridge/deposit';
                body = {
                    btcTxHash: 'pending_' + Date.now(), // This would be a real BTC tx hash in production
                    amount,
                    starknetRecipient: toAddress,
                    confirmations: 6,
                    useContractValidation: true,
                    walletAddress: walletAddress || fromAddress
                };
            } else if (direction === 'starknet-to-bitcoin') {
                endpoint = '/api/bridge/withdrawal';
                body = {
                    amount,
                    btcRecipient: toAddress,
                    starknetSender: fromAddress,
                    useContractValidation: true,
                    walletAddress: walletAddress || fromAddress
                };
            } else {
                throw new Error('Invalid bridge direction');
            }

            // Show loading state
            this.showNotification(`Initiating ${direction.replace('-', ' to ')} bridge transfer...`, false);

            const response = await this.request(endpoint, {
                method: 'POST',
                body,
                timeout: 30000 // 30 second timeout for bridge operations
            });

            if (response.success) {
                this.emit('bridgeInitiated', response.data);
                this.showNotification(`Bridge transfer initiated successfully! Transaction ID: ${response.data.depositId || response.data.withdrawalId}`, false);

                // Start monitoring the transaction
                this.monitorBridgeTransaction(response.data);
            } else {
                throw new Error(response.error || 'Bridge transfer failed');
            }

            return response;

        } catch (error) {
            console.error('Bridge transfer failed:', error);
            this.emit('bridgeError', error);
            this.showNotification(`Bridge transfer failed: ${error.message}`, true);
            throw error;
        }
    }

    // Monitor bridge transaction progress
    async monitorBridgeTransaction(transactionData) {
        try {
            const { depositId, withdrawalId, btcTxHash } = transactionData;
            const transactionId = depositId || withdrawalId || btcTxHash;

            if (!transactionId) {
                console.warn('No transaction ID to monitor');
                return;
            }

            // Poll for status updates every 5 seconds
            const statusInterval = setInterval(async () => {
                try {
                    let statusResponse;
                    if (depositId || btcTxHash) {
                        statusResponse = await this.request(`/api/bridge/deposit/${btcTxHash || depositId}`);
                    } else if (withdrawalId) {
                        statusResponse = await this.request(`/api/bridge/withdrawal/${withdrawalId}`);
                    }

                    if (statusResponse && statusResponse.success) {
                        const status = statusResponse.data.status;

                        // Update UI with current status
                        this.emit('bridgeStatusUpdate', {
                            transactionId,
                            status,
                            data: statusResponse.data
                        });

                        // Handle completion
                        if (status === 'completed') {
                            clearInterval(statusInterval);
                            this.showNotification('Bridge transfer completed successfully!', false);
                            this.emit('bridgeCompleted', statusResponse.data);
                        } else if (status === 'failed') {
                            clearInterval(statusInterval);
                            this.showNotification('Bridge transfer failed. Please contact support.', true);
                            this.emit('bridgeFailed', statusResponse.data);
                        }
                    }
                } catch (error) {
                    console.warn('Failed to check bridge status:', error);
                }
            }, 5000);

            // Stop monitoring after 30 minutes
            setTimeout(() => {
                clearInterval(statusInterval);
                console.log('Bridge transaction monitoring timeout');
            }, 30 * 60 * 1000);

        } catch (error) {
            console.error('Bridge transaction monitoring failed:', error);
        }
    }

    // Enhanced Bitcoin Utilities using BitcoinUtils Contract
    async validateBitcoinAddress(address) {
        try {
            const response = await this.request('/api/bitcoin/validate-address', {
                method: 'POST',
                body: { address }
            });

            return response;
        } catch (error) {
            console.error('Bitcoin address validation failed:', error);
            throw error;
        }
    }

    async parseBitcoinTransaction(rawTxHex) {
        try {
            const response = await this.request('/api/bitcoin/parse-transaction', {
                method: 'POST',
                body: { rawTxHex }
            });

            return response;
        } catch (error) {
            console.error('Bitcoin transaction parsing failed:', error);
            throw error;
        }
    }

    async generateBitcoinDepositAddress(starknetRecipient, network = 'Mainnet') {
        try {
            const response = await this.request('/api/bitcoin/generate-deposit-address', {
                method: 'POST',
                body: { starknetRecipient, network }
            });

            return response;
        } catch (error) {
            console.error('Bitcoin deposit address generation failed:', error);
            throw error;
        }
    }

    // Enhanced Cryptographic Operations using CryptoUtils Contract
    async computeMerkleRoot(txids) {
        try {
            const response = await this.request('/api/bitcoin/compute-merkle-root', {
                method: 'POST',
                body: { txids }
            });

            return response;
        } catch (error) {
            console.error('Merkle root computation failed:', error);
            throw error;
        }
    }

    async verifyMerkleProof(txid, merkleRoot, merkleBranch, position) {
        try {
            const response = await this.request('/api/bitcoin/verify-merkle-proof', {
                method: 'POST',
                body: { txid, merkleRoot, merkleBranch, position }
            });

            return response;
        } catch (error) {
            console.error('Merkle proof verification failed:', error);
            throw error;
        }
    }

    // Enhanced SPV Operations using SPVVerifier Contract
    async verifyTransactionInclusion(merkleProof, blockHeight) {
        try {
            const response = await this.request('/api/bitcoin/verify-transaction-inclusion', {
                method: 'POST',
                body: { merkleProof, blockHeight }
            });

            return response;
        } catch (error) {
            console.error('Transaction inclusion verification failed:', error);
            throw error;
        }
    }

    // Bitcoin Header Operations using BitcoinHeaders Contract
    async submitBitcoinHeader(header) {
        try {
            const response = await this.request('/api/bitcoin/submit-header', {
                method: 'POST',
                body: { header }
            });

            return response;
        } catch (error) {
            console.error('Bitcoin header submission failed:', error);
            throw error;
        }
    }

    async getBitcoinHeader(height) {
        try {
            const response = await this.request(`/api/bitcoin/header/${height}`);
            return response;
        } catch (error) {
            console.error('Bitcoin header retrieval failed:', error);
            throw error;
        }
    }

    // Contract Address Management
    async getContractAddresses() {
        try {
            const response = await this.request('/api/contracts/addresses');
            return response;
        } catch (error) {
            console.error('Failed to get contract addresses:', error);
            throw error;
        }
    }

    async getContractABI(contractName) {
        try {
            const response = await this.request(`/api/contracts/abi/${contractName}`);
            return response;
        } catch (error) {
            console.error('Failed to get contract ABI:', error);
            throw error;
        }
    }

    // Enhanced Staking Operations with Contract Integration
    async getStakingConfig() {
        try {
            const response = await this.request('/api/staking/config');
            return response;
        } catch (error) {
            console.error('Failed to get staking config:', error);
            throw error;
        }
    }

    async getStakingPosition(address, tokenAddress) {
        try {
            const response = await this.request(`/api/staking/position/${address}/${tokenAddress}`);
            return response;
        } catch (error) {
            console.error('Failed to get staking position:', error);
            throw error;
        }
    }

    async getStakingRewards(address) {
        try {
            const response = await this.request(`/api/staking/rewards/${address}`);
            return response;
        } catch (error) {
            console.error('Failed to get staking rewards:', error);
            throw error;
        }
    }

    // Swap Operations
    async executeSwap(params) {
        try {
            const {
                fromToken,
                toToken,
                amount,
                minAmountOut,
                walletPrivateKey,
                walletAddress
            } = params;

            const response = await this.request('/api/wallet/swap/execute', {
                method: 'POST',
                body: {
                    fromToken,
                    toToken,
                    amount,
                    minAmountOut,
                    walletPrivateKey,
                    walletAddress
                }
            });

            if (response.success) {
                this.emit('swapExecuted', response.data);
            }

            return response;

        } catch (error) {
            console.error('Swap execution failed:', error);
            throw error;
        }
    }

    // Deposit Operations
    async executeDeposit(params) {
        try {
            const {
                tokenAddress,
                amount,
                walletPrivateKey,
                walletAddress
            } = params;

            const response = await this.request('/api/wallet/deposit/execute', {
                method: 'POST',
                body: {
                    tokenAddress,
                    amount,
                    walletPrivateKey,
                    walletAddress
                }
            });

            if (response.success) {
                this.emit('depositExecuted', response.data);
            }

            return response;

        } catch (error) {
            console.error('Deposit execution failed:', error);
            throw error;
        }
    }

    // Withdraw Operations
    async executeWithdrawal(params) {
        try {
            const {
                tokenAddress,
                amount,
                walletPrivateKey,
                walletAddress
            } = params;

            const response = await this.request('/api/wallet/withdraw/execute', {
                method: 'POST',
                body: {
                    tokenAddress,
                    amount,
                    walletPrivateKey,
                    walletAddress
                }
            });

            if (response.success) {
                this.emit('withdrawalExecuted', response.data);
            }

            return response;

        } catch (error) {
            console.error('Withdrawal execution failed:', error);
            throw error;
        }
    }

    // Send Operations
    async executeSend(params) {
        try {
            const {
                tokenAddress,
                recipient,
                amount,
                walletPrivateKey,
                walletAddress
            } = params;

            const response = await this.request('/api/wallet/send/execute', {
                method: 'POST',
                body: {
                    tokenAddress,
                    recipient,
                    amount,
                    walletPrivateKey,
                    walletAddress
                }
            });

            if (response.success) {
                this.emit('sendExecuted', response.data);
            }

            return response;

        } catch (error) {
            console.error('Send execution failed:', error);
            throw error;
        }
    }

    // Staking Operations
    async executeStake(params) {
        try {
            const {
                tokenAddress,
                amount,
                lockPeriod,
                walletPrivateKey,
                walletAddress
            } = params;

            const response = await this.request('/api/wallet/staking/stake', {
                method: 'POST',
                body: {
                    tokenAddress,
                    amount,
                    lockPeriod,
                    walletPrivateKey,
                    walletAddress
                }
            });

            if (response.success) {
                this.emit('stakeExecuted', response.data);
            }

            return response;

        } catch (error) {
            console.error('Staking execution failed:', error);
            throw error;
        }
    }

    async executeUnstake(params) {
        try {
            const {
                tokenAddress,
                amount,
                walletPrivateKey,
                walletAddress
            } = params;

            const response = await this.request('/api/wallet/staking/unstake', {
                method: 'POST',
                body: {
                    tokenAddress,
                    amount,
                    walletPrivateKey,
                    walletAddress
                }
            });

            if (response.success) {
                this.emit('unstakeExecuted', response.data);
            }

            return response;

        } catch (error) {
            console.error('Unstaking execution failed:', error);
            throw error;
        }
    }

    async executeClaimRewards(params) {
        try {
            const {
                tokenAddress,
                walletPrivateKey,
                walletAddress
            } = params;

            const response = await this.request('/api/wallet/staking/claim-rewards', {
                method: 'POST',
                body: {
                    tokenAddress,
                    walletPrivateKey,
                    walletAddress
                }
            });

            if (response.success) {
                this.emit('rewardsClaimed', response.data);
            }

            return response;

        } catch (error) {
            console.error('Claim rewards execution failed:', error);
            throw error;
        }
    }

    // Data Retrieval
    async getUserBalances(address) {
        try {
            const response = await this.request(`/api/wallet/balances/${address}`);
            return response;
        } catch (error) {
            console.error('Failed to get user balances:', error);
            throw error;
        }
    }

    async getTokenBalance(tokenAddress, address) {
        try {
            const response = await this.request(`/api/wallet/balance/${tokenAddress}/${address}`);
            return response;
        } catch (error) {
            console.error('Failed to get token balance:', error);
            throw error;
        }
    }

    async getTransactionHistory(address, limit = 50) {
        try {
            const response = await this.request(`/api/wallet/transactions/${address}?limit=${limit}`);
            return response;
        } catch (error) {
            console.error('Failed to get transaction history:', error);
            throw error;
        }
    }

    // Transaction Monitoring
    async monitorTransaction(transactionHash, callback) {
        try {
            const eventSource = new EventSource(`${this.config.apiUrl}/api/wallet/monitor/${transactionHash}`);

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (callback && typeof callback === 'function') {
                        callback(data);
                    }

                    // Close connection when transaction is complete or failed
                    if (data.status === 'confirmed' || data.status === 'failed') {
                        eventSource.close();
                    }

                } catch (error) {
                    console.error('Failed to parse monitoring message:', error);
                }
            };

            eventSource.onerror = (error) => {
                console.error('Monitoring error:', error);
                eventSource.close();
            };

            return eventSource;

        } catch (error) {
            console.error('Transaction monitoring failed:', error);
            throw error;
        }
    }

    // Utility Functions
    validateStarknetAddress(address) {
        return /^0x[a-fA-F0-9]{64}$/.test(address);
    }

    validateBitcoinAddress(address) {
        const bitcoinPatterns = [
            /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/, // Legacy (P2PKH)
            /^[bc1][a-z0-9]{39,59}$/, // SegWit (Bech32)
            /^[3][a-km-zA-HJ-NP-Z1-9]{25,34}$/ // P2SH
        ];
        return bitcoinPatterns.some(pattern => pattern.test(address));
    }

    formatAmount(amount, decimals = 8) {
        const num = parseFloat(amount);
        return num.toFixed(decimals);
    }

    // Health Check with Enhanced Diagnostics
    async healthCheck() {
        try {
            const response = await this.request('/api/wallet/health', {
                timeout: 10000 // 10 second timeout for health checks
            });
            return response;
        } catch (error) {
            console.error('Health check failed:', error);

            // Return detailed health status for debugging
            return {
                success: false,
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString(),
                diagnostics: {
                    websocketConnected: this.isConnected,
                    activeWallets: this.connectedWallets.size,
                    pendingRequests: this.requestQueue.length,
                    fallbackMode: true
                }
            };
        }
    }

    // Enhanced Bridge Health Check
    async checkBridgeHealth() {
        try {
            const response = await this.request('/api/bridge/health', {
                timeout: 15000 // 15 second timeout for bridge health
            });

            if (response.success) {
                this.emit('bridgeConnected', response.data);
                return response.data;
            } else {
                throw new Error(response.error || 'Bridge health check failed');
            }
        } catch (error) {
            console.error('Bridge health check failed:', error);

            // Emit connection lost event
            this.emit('bridgeDisconnected', { error: error.message });

            // Return fallback health status
            return {
                status: 'degraded',
                error: error.message,
                fallbackMode: true,
                services: {
                    bitcoin: { status: 'unknown', error: 'Service unavailable' },
                    starknet: { status: 'unknown', error: 'Service unavailable' },
                    database: { status: 'unknown', error: 'Service unavailable' }
                },
                timestamp: new Date().toISOString()
            };
        }
    }

    // Retry mechanism for failed operations
    async retryOperation(operation, maxRetries = 3, delay = 1000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                console.warn(`Operation attempt ${attempt}/${maxRetries} failed:`, error.message);

                if (attempt === maxRetries) {
                    throw new Error(`Operation failed after ${maxRetries} attempts: ${error.message}`);
                }

                // Exponential backoff
                const waitTime = delay * Math.pow(2, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }

    // Enhanced contract interaction with fallback
    async executeContractOperation(contractName, method, params = {}, options = {}) {
        const operation = async () => {
            const endpoint = `/api/contracts/${contractName}/${method}`;

            const response = await this.request(endpoint, {
                method: 'POST',
                body: params,
                timeout: options.timeout || 30000,
                ...options
            });

            if (response.success) {
                return response.data;
            } else {
                throw new Error(response.error || `Contract operation failed: ${method}`);
            }
        };

        try {
            return await this.retryOperation(operation, options.maxRetries || 2);
        } catch (error) {
            console.error(`Contract operation failed: ${contractName}.${method}`, error);

            // Try fallback if available
            if (options.fallback) {
                console.log('Attempting fallback operation...');
                try {
                    return await options.fallback();
                } catch (fallbackError) {
                    console.error('Fallback operation also failed:', fallbackError);
                }
            }

            throw error;
        }
    }

    // Notification System
    showNotification(message, isError = false) {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('vernwallet-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'vernwallet-notification';
            notification.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 15px 25px;
                background: ${isError ? '#ef4444' : '#10b981'};
                color: white;
                border-radius: 8px;
                z-index: 10000;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
                transform: translateY(100px);
                opacity: 0;
                transition: all 0.3s ease;
                max-width: 400px;
                font-family: 'Inter', sans-serif;
            `;
            document.body.appendChild(notification);
        }

        notification.textContent = message;
        notification.style.background = isError ? '#ef4444' : '#10b981';

        // Show notification
        setTimeout(() => {
            notification.style.transform = 'translateY(0)';
            notification.style.opacity = '1';
        }, 100);

        // Hide notification after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateY(100px)';
            notification.style.opacity = '0';
        }, 3000);
    }
}

// Create global instance
window.vernWalletIntegration = new VernWalletIntegration();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VernWalletIntegration;
}