/**
 * Bridge Fallback Service
 * Provides robust fallback mechanisms for bridge operations when primary services fail
 * Ensures bridge continues to function even during service disruptions
 */

const EventEmitter = require('events');
const logger = require('../utils/logger');

class BridgeFallbackService extends EventEmitter {
    constructor() {
        super();
        this.fallbackMode = false;
        this.fallbackOperations = new Map();
        this.operationHistory = [];
        this.maxHistorySize = 1000;

        this.initializeFallbackOperations();
    }

    initializeFallbackOperations() {
        // Define fallback operations for critical bridge functions
        this.fallbackOperations.set('bitcoinValidation', this.bitcoinValidationFallback.bind(this));
        this.fallbackOperations.set('starknetValidation', this.starknetValidationFallback.bind(this));
        this.fallbackOperations.set('depositCreation', this.depositCreationFallback.bind(this));
        this.fallbackOperations.set('withdrawalCreation', this.withdrawalCreationFallback.bind(this));
        this.fallbackOperations.set('statusCheck', this.statusCheckFallback.bind(this));
        this.fallbackOperations.set('balanceCheck', this.balanceCheckFallback.bind(this));
    }

    // Main fallback execution method
    async executeWithFallback(operation, params = {}, options = {}) {
        const startTime = Date.now();
        const operationId = `${operation}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        try {
            // Try primary operation first
            if (!this.fallbackMode || options.forcePrimary) {
                const result = await this.executePrimaryOperation(operation, params);

                this.recordOperationSuccess(operationId, operation, 'primary', Date.now() - startTime);
                return result;
            }
        } catch (error) {
            logger.warn(`Primary operation ${operation} failed, switching to fallback:`, error.message);

            // Record primary failure
            this.recordOperationFailure(operationId, operation, 'primary', error.message, Date.now() - startTime);

            // Emit fallback activated event
            this.emit('fallbackActivated', { operation, error: error.message, operationId });
        }

        try {
            // Execute fallback operation
            const fallbackFn = this.fallbackOperations.get(operation);
            if (!fallbackFn) {
                throw new Error(`No fallback available for operation: ${operation}`);
            }

            const result = await fallbackFn(params);

            this.recordOperationSuccess(operationId, operation, 'fallback', Date.now() - startTime);
            this.emit('fallbackSuccess', { operation, operationId, duration: Date.now() - startTime });

            return result;

        } catch (fallbackError) {
            logger.error(`Fallback operation ${operation} also failed:`, fallbackError.message);

            this.recordOperationFailure(operationId, operation, 'fallback', fallbackError.message, Date.now() - startTime);
            this.emit('fallbackFailed', { operation, error: fallbackError.message, operationId });

            throw fallbackError;
        }
    }

    async executePrimaryOperation(operation, params) {
        // This would call the actual service methods
        // For now, we'll simulate some operations that might fail
        switch (operation) {
            case 'bitcoinValidation':
                return await this.simulateBitcoinValidation(params.address);
            case 'starknetValidation':
                return await this.simulateStarknetValidation(params.address);
            case 'depositCreation':
                return await this.simulateDepositCreation(params);
            case 'withdrawalCreation':
                return await this.simulateWithdrawalCreation(params);
            case 'statusCheck':
                return await this.simulateStatusCheck(params.transactionId);
            case 'balanceCheck':
                return await this.simulateBalanceCheck(params.address);
            default:
                throw new Error(`Unknown operation: ${operation}`);
        }
    }

    // Fallback operation implementations
    async bitcoinValidationFallback(address) {
        logger.info('Using fallback Bitcoin address validation');

        // Basic regex validation as fallback
        const bitcoinPatterns = [
            /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/, // Legacy (P2PKH)
            /^[bc1][a-z0-9]{39,59}$/, // SegWit (Bech32)
            /^[3][a-km-zA-HJ-NP-Z1-9]{25,34}$/ // P2SH
        ];

        const isValid = bitcoinPatterns.some(pattern => pattern.test(address));

        return {
            success: true,
            isValid,
            address,
            fallback: true,
            validationMethod: 'regex',
            timestamp: new Date().toISOString()
        };
    }

    async starknetValidationFallback(address) {
        logger.info('Using fallback Starknet address validation');

        // Basic format validation as fallback
        const isValid = /^0x[a-fA-F0-9]{64}$/.test(address);

        return {
            success: true,
            isValid,
            address,
            fallback: true,
            validationMethod: 'format',
            timestamp: new Date().toISOString()
        };
    }

    async depositCreationFallback(params) {
        logger.info('Using fallback deposit creation');

        const depositId = 'DEP-FALLBACK-' + Date.now();

        return {
            success: true,
            depositId,
            btcTxHash: params.btcTxHash,
            amount: params.amount,
            starknetRecipient: params.starknetRecipient,
            status: 'pending_fallback',
            fallback: true,
            message: 'Created using fallback mechanism - manual processing required',
            estimatedTime: '30-60 minutes',
            timestamp: new Date().toISOString()
        };
    }

    async withdrawalCreationFallback(params) {
        logger.info('Using fallback withdrawal creation');

        const withdrawalId = 'WD-FALLBACK-' + Date.now();

        return {
            success: true,
            withdrawalId,
            amount: params.amount,
            btcRecipient: params.btcRecipient,
            starknetSender: params.starknetSender,
            status: 'pending_fallback',
            fallback: true,
            message: 'Created using fallback mechanism - manual processing required',
            estimatedTime: '45-90 minutes',
            timestamp: new Date().toISOString()
        };
    }

    async statusCheckFallback(transactionId) {
        logger.info('Using fallback status check');

        return {
            success: true,
            transactionId,
            status: 'unknown',
            fallback: true,
            message: 'Status unavailable - fallback mode active',
            lastChecked: new Date().toISOString(),
            nextRetry: new Date(Date.now() + 300000).toISOString() // 5 minutes from now
        };
    }

    async balanceCheckFallback(address) {
        logger.info('Using fallback balance check');

        return {
            success: true,
            address,
            balance: '0',
            formattedBalance: '0.00000000',
            fallback: true,
            message: 'Balance unavailable - fallback mode active',
            lastChecked: new Date().toISOString()
        };
    }

    // Simulation methods (replace with actual service calls)
    async simulateBitcoinValidation(address) {
        // Simulate occasional failures for testing
        if (Math.random() < 0.1) {
            throw new Error('Bitcoin validation service unavailable');
        }

        return {
            success: true,
            isValid: true,
            address,
            validationMethod: 'service',
            timestamp: new Date().toISOString()
        };
    }

    async simulateStarknetValidation(address) {
        if (Math.random() < 0.1) {
            throw new Error('Starknet validation service unavailable');
        }

        return {
            success: true,
            isValid: true,
            address,
            validationMethod: 'service',
            timestamp: new Date().toISOString()
        };
    }

    async simulateDepositCreation(params) {
        if (Math.random() < 0.1) {
            throw new Error('Deposit service unavailable');
        }

        return {
            success: true,
            depositId: 'DEP-' + Date.now(),
            ...params,
            status: 'pending',
            timestamp: new Date().toISOString()
        };
    }

    async simulateWithdrawalCreation(params) {
        if (Math.random() < 0.1) {
            throw new Error('Withdrawal service unavailable');
        }

        return {
            success: true,
            withdrawalId: 'WD-' + Date.now(),
            ...params,
            status: 'pending',
            timestamp: new Date().toISOString()
        };
    }

    async simulateStatusCheck(transactionId) {
        if (Math.random() < 0.1) {
            throw new Error('Status check service unavailable');
        }

        return {
            success: true,
            transactionId,
            status: 'processing',
            timestamp: new Date().toISOString()
        };
    }

    async simulateBalanceCheck(address) {
        if (Math.random() < 0.1) {
            throw new Error('Balance check service unavailable');
        }

        return {
            success: true,
            address,
            balance: '1000000',
            formattedBalance: '0.01000000',
            timestamp: new Date().toISOString()
        };
    }

    // Operation history management
    recordOperationSuccess(operationId, operation, method, duration) {
        this.addToHistory({
            operationId,
            operation,
            method,
            success: true,
            duration,
            timestamp: new Date().toISOString()
        });
    }

    recordOperationFailure(operationId, operation, method, error, duration) {
        this.addToHistory({
            operationId,
            operation,
            method,
            success: false,
            error,
            duration,
            timestamp: new Date().toISOString()
        });
    }

    addToHistory(record) {
        this.operationHistory.unshift(record);

        // Maintain history size limit
        if (this.operationHistory.length > this.maxHistorySize) {
            this.operationHistory = this.operationHistory.slice(0, this.maxHistorySize);
        }
    }

    // Get operation statistics
    getOperationStats(timeRange = 3600000) { // 1 hour default
        const cutoffTime = Date.now() - timeRange;
        const recentOperations = this.operationHistory.filter(
            op => new Date(op.timestamp).getTime() > cutoffTime
        );

        const stats = {
            total: recentOperations.length,
            successful: recentOperations.filter(op => op.success).length,
            failed: recentOperations.filter(op => !op.success).length,
            fallbackUsed: recentOperations.filter(op => op.method === 'fallback').length,
            averageDuration: recentOperations.length > 0
                ? recentOperations.reduce((sum, op) => sum + op.duration, 0) / recentOperations.length
                : 0
        };

        stats.successRate = stats.total > 0 ? (stats.successful / stats.total) * 100 : 0;

        return stats;
    }

    // Enable/disable fallback mode
    enableFallbackMode(reason = 'Manual activation') {
        this.fallbackMode = true;
        logger.warn(`Fallback mode enabled: ${reason}`);
        this.emit('fallbackModeEnabled', { reason, timestamp: new Date().toISOString() });
    }

    disableFallbackMode() {
        this.fallbackMode = false;
        logger.info('Fallback mode disabled');
        this.emit('fallbackModeDisabled', { timestamp: new Date().toISOString() });
    }

    // Get fallback status
    getFallbackStatus() {
        const stats = this.getOperationStats();

        return {
            fallbackMode: this.fallbackMode,
            availableOperations: Array.from(this.fallbackOperations.keys()),
            statistics: stats,
            historySize: this.operationHistory.length,
            lastOperation: this.operationHistory[0] || null,
            timestamp: new Date().toISOString()
        };
    }

    // Health check for fallback service
    async healthCheck() {
        try {
            const stats = this.getOperationStats(300000); // Last 5 minutes

            let status = 'healthy';
            if (stats.successRate < 50) {
                status = 'degraded';
            }
            if (stats.successRate < 20 || this.fallbackMode) {
                status = 'fallback_active';
            }

            return {
                status,
                fallbackMode: this.fallbackMode,
                statistics: stats,
                availableFallbacks: this.fallbackOperations.size,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Fallback service health check failed:', error);
            return {
                status: 'unhealthy',
                error: error.message,
                fallbackMode: this.fallbackMode,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// Export singleton instance
module.exports = new BridgeFallbackService();