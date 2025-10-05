/**
 * Wallet Integration Service - Handles all wallet connections and contract interactions
 * for frontend features (Bridge, Swap, Lock-Unlock, Deposit, Withdraw, Send, Receive, Earn)
 */

const starknetService = require('./starknet');
const bitcoinService = require('./bitcoin');
const logger = require('../utils/logger');

class WalletIntegrationService {
    constructor() {
        this.connectedWallets = new Map();
        this.activeWallet = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            // Try to initialize StarkNet service but don't fail if it doesn't work
            try {
                await starknetService.initialize();
                logger.info('StarkNet service initialized successfully');
            } catch (starknetError) {
                logger.warn('StarkNet service initialization failed, running in fallback mode:', starknetError.message);
                // Continue without StarkNet - service will work in fallback mode
            }

            this.isInitialized = true;
            logger.info('Wallet integration service initialized (fallback mode enabled)');
        } catch (error) {
            logger.error('Failed to initialize wallet integration service:', error);
            throw error;
        }
    }

    // Wallet Connection Management
    async connectStarknetWallet(walletType, credentials = {}) {
        try {
            let walletInfo;

            switch (walletType) {
                case 'argentx':
                    walletInfo = await this.connectArgentXWallet(credentials);
                    break;
                case 'braavos':
                    walletInfo = await this.connectBraavosWallet(credentials);
                    break;
                case 'manual':
                    walletInfo = await this.connectManualWallet(credentials);
                    break;
                default:
                    throw new Error(`Unsupported wallet type: ${walletType}`);
            }

            this.connectedWallets.set(walletInfo.address, {
                type: walletType,
                address: walletInfo.address,
                name: walletInfo.name,
                connectedAt: new Date()
            });

            this.activeWallet = walletInfo.address;
            logger.info(`Starknet wallet connected: ${walletInfo.address}`);

            return walletInfo;

        } catch (error) {
            logger.error('Failed to connect Starknet wallet:', error);
            throw error;
        }
    }

    async connectArgentXWallet(credentials) {
        try {
            if (typeof window !== 'undefined' && window.starknet) {
                await window.starknet.enable();
                return {
                    address: window.starknet.selectedAddress,
                    name: 'Argent X',
                    type: 'argentx'
                };
            } else {
                throw new Error('Argent X wallet not available');
            }
        } catch (error) {
            logger.error('Argent X connection failed:', error);
            throw error;
        }
    }

    async connectBraavosWallet(credentials) {
        try {
            if (typeof window !== 'undefined' && window.starknet) {
                await window.starknet.enable();
                return {
                    address: window.starknet.selectedAddress,
                    name: 'Braavos',
                    type: 'braavos'
                };
            } else {
                throw new Error('Braavos wallet not available');
            }
        } catch (error) {
            logger.error('Braavos connection failed:', error);
            throw error;
        }
    }

    async connectManualWallet(credentials) {
        try {
            const { address, privateKey } = credentials;

            if (!address) {
                throw new Error('Wallet address is required');
            }

            // Validate StarkNet address format
            if (!/^0x[a-fA-F0-9]{64}$/.test(address)) {
                throw new Error('Invalid StarkNet address format');
            }

            return {
                address,
                name: 'Manual Entry',
                type: 'manual',
                privateKey: privateKey || null
            };

        } catch (error) {
            logger.error('Manual wallet connection failed:', error);
            throw error;
        }
    }

    // Bridge Operations
    async initiateBridgeTransfer(params) {
        try {
            const {
                direction,
                amount,
                fromAddress,
                toAddress,
                walletPrivateKey,
                walletAddress
            } = params;

            let result;

            if (direction === 'bitcoin-to-starknet') {
                // Generate a mock BTC transaction hash for demo purposes
                const btcTxHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');

                result = await starknetService.bridgeBitcoinToStarknet(
                    btcTxHash,
                    amount,
                    toAddress,
                    walletPrivateKey,
                    walletAddress
                );

            } else if (direction === 'starknet-to-bitcoin') {
                result = await starknetService.bridgeStarknetToBitcoin(
                    amount,
                    toAddress,
                    walletPrivateKey,
                    walletAddress
                );
            } else {
                throw new Error(`Unsupported bridge direction: ${direction}`);
            }

            return {
                success: true,
                transactionHash: result.transactionHash,
                direction,
                amount,
                fromAddress,
                toAddress,
                status: 'initiated'
            };

        } catch (error) {
            logger.error('Bridge transfer failed:', error);
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

            const result = await starknetService.swapTokens(
                fromToken,
                toToken,
                amount,
                minAmountOut,
                walletPrivateKey,
                walletAddress
            );

            return {
                success: true,
                transactionHash: result.transactionHash,
                fromToken,
                toToken,
                amount,
                expectedOutput: minAmountOut,
                status: 'completed'
            };

        } catch (error) {
            logger.error('Swap execution failed:', error);
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

            const result = await starknetService.depositToContract(
                tokenAddress,
                amount,
                walletPrivateKey,
                walletAddress
            );

            return {
                success: true,
                transactionHash: result.transactionHash,
                tokenAddress,
                amount,
                type: 'deposit',
                status: 'completed'
            };

        } catch (error) {
            logger.error('Deposit execution failed:', error);
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

            const result = await starknetService.withdrawFromContract(
                tokenAddress,
                amount,
                walletPrivateKey,
                walletAddress
            );

            return {
                success: true,
                transactionHash: result.transactionHash,
                tokenAddress,
                amount,
                type: 'withdrawal',
                status: 'completed'
            };

        } catch (error) {
            logger.error('Withdrawal execution failed:', error);
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

            const result = await starknetService.sendTokens(
                tokenAddress,
                recipient,
                amount,
                walletPrivateKey,
                walletAddress
            );

            return {
                success: true,
                transactionHash: result.transactionHash,
                tokenAddress,
                recipient,
                amount,
                type: 'send',
                status: 'completed'
            };

        } catch (error) {
            logger.error('Send execution failed:', error);
            throw error;
        }
    }

    // Staking Operations
    async executeStake(params) {
        try {
            const {
                tokenAddress,
                amount,
                lockPeriod = 30,
                walletPrivateKey,
                walletAddress
            } = params;

            const result = await starknetService.stakeTokens(
                tokenAddress,
                amount,
                lockPeriod,
                walletPrivateKey,
                walletAddress
            );

            return {
                success: true,
                transactionHash: result.transactionHash,
                tokenAddress,
                amount,
                lockPeriod,
                type: 'stake',
                status: 'completed'
            };

        } catch (error) {
            logger.error('Staking execution failed:', error);
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

            const result = await starknetService.unstakeTokens(
                tokenAddress,
                amount,
                walletPrivateKey,
                walletAddress
            );

            return {
                success: true,
                transactionHash: result.transactionHash,
                tokenAddress,
                amount,
                type: 'unstake',
                status: 'completed'
            };

        } catch (error) {
            logger.error('Unstaking execution failed:', error);
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

            const result = await starknetService.claimStakingRewards(
                tokenAddress,
                walletPrivateKey,
                walletAddress
            );

            return {
                success: true,
                transactionHash: result.transactionHash,
                tokenAddress,
                type: 'claim_rewards',
                status: 'completed'
            };

        } catch (error) {
            logger.error('Claim rewards execution failed:', error);
            throw error;
        }
    }

    // Data Retrieval Operations
    async getUserBalances(address) {
        try {
            // Check if StarkNet service is available
            if (!starknetService.isInitialized) {
                logger.warn('StarkNet service not initialized, using fallback balances');
                return this.getFallbackBalances(address);
            }

            return await starknetService.getUserBalances(address);
        } catch (error) {
            logger.error('Failed to get user balances, using fallback:', error);
            return this.getFallbackBalances(address);
        }
    }

    // Fallback balances when StarkNet is not available
    getFallbackBalances(address) {
        return {
            address,
            balances: {
                SBTC: {
                    address,
                    balance: '0',
                    formattedBalance: '0.00000000'
                },
                ETH: {
                    address,
                    balance: '0',
                    formattedBalance: '0.00000000'
                }
            },
            staking: {
                position: {
                    user: address,
                    token: 'SBTC',
                    amount: '0',
                    stakedAt: new Date(),
                    lastRewardUpdate: new Date(),
                    rewardDebt: '0'
                },
                rewards: {
                    user: address,
                    rewards: '0',
                    formattedRewards: '0.00000000'
                }
            },
            timestamp: new Date().toISOString(),
            fallbackMode: true
        };
    }

    async getTransactionHistory(address, limit = 50) {
        try {
            return await starknetService.getTransactionHistory(address, limit);
        } catch (error) {
            logger.error('Failed to get transaction history:', error);
            throw error;
        }
    }

    async getTokenBalance(tokenAddress, address) {
        try {
            if (tokenAddress === 'SBTC') {
                return await starknetService.getSBTCBalance(address);
            } else {
                // For other tokens, implement specific logic
                return {
                    address,
                    tokenAddress,
                    balance: '0',
                    formattedBalance: '0.00'
                };
            }
        } catch (error) {
            logger.error('Failed to get token balance:', error);
            throw error;
        }
    }

    // Transaction Monitoring
    async monitorTransaction(transactionHash, callback) {
        try {
            const receipt = await starknetService.waitForTransaction(transactionHash);

            if (callback && typeof callback === 'function') {
                callback({
                    status: 'confirmed',
                    transactionHash,
                    receipt,
                    timestamp: new Date().toISOString()
                });
            }

            return receipt;

        } catch (error) {
            logger.error('Transaction monitoring failed:', error);

            if (callback && typeof callback === 'function') {
                callback({
                    status: 'failed',
                    transactionHash,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }

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

    // Health Check
    async healthCheck() {
        try {
            const starknetHealth = await starknetService.healthCheck();

            return {
                status: starknetHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
                services: {
                    starknet: starknetHealth
                },
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Health check failed:', error);
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Disconnect wallet
    disconnectWallet(address) {
        try {
            if (this.connectedWallets.has(address)) {
                this.connectedWallets.delete(address);
                logger.info(`Wallet disconnected: ${address}`);
            }

            if (this.activeWallet === address) {
                this.activeWallet = null;
            }

            return {
                success: true,
                message: 'Wallet disconnected successfully'
            };

        } catch (error) {
            logger.error('Failed to disconnect wallet:', error);
            throw error;
        }
    }

    // Get connected wallet info
    getConnectedWalletInfo() {
        if (!this.activeWallet) {
            return null;
        }

        return this.connectedWallets.get(this.activeWallet);
    }

    // Get all connected wallets
    getAllConnectedWallets() {
        return Array.from(this.connectedWallets.values());
    }
}

// Export singleton instance
module.exports = new WalletIntegrationService();