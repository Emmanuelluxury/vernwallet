/**
 * Wallet Integration API Routes
 * Handles all wallet operations for frontend features
 */

const express = require('express');
const router = express.Router();
const walletIntegration = require('../services/wallet-integration');
const logger = require('../utils/logger');

// Initialize wallet integration service
walletIntegration.initialize().catch(error => {
    logger.error('Failed to initialize wallet integration:', error);
});

// Middleware to check if service is initialized
const checkInitialized = (req, res, next) => {
    if (!walletIntegration.isInitialized) {
        return res.status(503).json({
            success: false,
            error: 'Wallet integration service not initialized'
        });
    }
    next();
};

// Health check endpoint
router.get('/health', async (req, res) => {
    try {
        const health = await walletIntegration.healthCheck();
        res.json(health);
    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Wallet Connection Endpoints
router.post('/connect/starknet', checkInitialized, async (req, res) => {
    try {
        const { walletType, credentials } = req.body;

        if (!walletType) {
            return res.status(400).json({
                success: false,
                error: 'Wallet type is required'
            });
        }

        const walletInfo = await walletIntegration.connectStarknetWallet(walletType, credentials);

        res.json({
            success: true,
            data: walletInfo
        });

    } catch (error) {
        logger.error('Starknet wallet connection failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Bridge Operations
router.post('/bridge/transfer', checkInitialized, async (req, res) => {
    try {
        const {
            direction,
            amount,
            fromAddress,
            toAddress,
            walletPrivateKey,
            walletAddress
        } = req.body;

        if (!direction || !amount || !toAddress || !walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: direction, amount, toAddress, walletAddress'
            });
        }

        const result = await walletIntegration.initiateBridgeTransfer({
            direction,
            amount: parseFloat(amount),
            fromAddress,
            toAddress,
            walletPrivateKey,
            walletAddress
        });

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        logger.error('Bridge transfer failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Swap Operations
router.post('/swap/execute', checkInitialized, async (req, res) => {
    try {
        const {
            fromToken,
            toToken,
            amount,
            minAmountOut,
            walletPrivateKey,
            walletAddress
        } = req.body;

        if (!fromToken || !toToken || !amount || !walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: fromToken, toToken, amount, walletAddress'
            });
        }

        const result = await walletIntegration.executeSwap({
            fromToken,
            toToken,
            amount: parseFloat(amount),
            minAmountOut: minAmountOut ? parseFloat(minAmountOut) : parseFloat(amount) * 0.995,
            walletPrivateKey,
            walletAddress
        });

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        logger.error('Swap execution failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Deposit Operations
router.post('/deposit/execute', checkInitialized, async (req, res) => {
    try {
        const {
            tokenAddress,
            amount,
            walletPrivateKey,
            walletAddress
        } = req.body;

        if (!tokenAddress || !amount || !walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: tokenAddress, amount, walletAddress'
            });
        }

        const result = await walletIntegration.executeDeposit({
            tokenAddress,
            amount: parseFloat(amount),
            walletPrivateKey,
            walletAddress
        });

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        logger.error('Deposit execution failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Withdraw Operations
router.post('/withdraw/execute', checkInitialized, async (req, res) => {
    try {
        const {
            tokenAddress,
            amount,
            walletPrivateKey,
            walletAddress
        } = req.body;

        if (!tokenAddress || !amount || !walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: tokenAddress, amount, walletAddress'
            });
        }

        const result = await walletIntegration.executeWithdrawal({
            tokenAddress,
            amount: parseFloat(amount),
            walletPrivateKey,
            walletAddress
        });

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        logger.error('Withdrawal execution failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Send Operations
router.post('/send/execute', checkInitialized, async (req, res) => {
    try {
        const {
            tokenAddress,
            recipient,
            amount,
            walletPrivateKey,
            walletAddress
        } = req.body;

        if (!tokenAddress || !recipient || !amount || !walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: tokenAddress, recipient, amount, walletAddress'
            });
        }

        const result = await walletIntegration.executeSend({
            tokenAddress,
            recipient,
            amount: parseFloat(amount),
            walletPrivateKey,
            walletAddress
        });

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        logger.error('Send execution failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Staking Operations
router.post('/staking/stake', checkInitialized, async (req, res) => {
    try {
        const {
            tokenAddress,
            amount,
            lockPeriod,
            walletPrivateKey,
            walletAddress
        } = req.body;

        if (!tokenAddress || !amount || !walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: tokenAddress, amount, walletAddress'
            });
        }

        const result = await walletIntegration.executeStake({
            tokenAddress,
            amount: parseFloat(amount),
            lockPeriod: lockPeriod || 30,
            walletPrivateKey,
            walletAddress
        });

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        logger.error('Staking execution failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.post('/staking/unstake', checkInitialized, async (req, res) => {
    try {
        const {
            tokenAddress,
            amount,
            walletPrivateKey,
            walletAddress
        } = req.body;

        if (!tokenAddress || !amount || !walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: tokenAddress, amount, walletAddress'
            });
        }

        const result = await walletIntegration.executeUnstake({
            tokenAddress,
            amount: parseFloat(amount),
            walletPrivateKey,
            walletAddress
        });

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        logger.error('Unstaking execution failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.post('/staking/claim-rewards', checkInitialized, async (req, res) => {
    try {
        const {
            tokenAddress,
            walletPrivateKey,
            walletAddress
        } = req.body;

        if (!tokenAddress || !walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: tokenAddress, walletAddress'
            });
        }

        const result = await walletIntegration.executeClaimRewards({
            tokenAddress,
            walletPrivateKey,
            walletAddress
        });

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        logger.error('Claim rewards execution failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Data Retrieval Endpoints
router.get('/balances/:address', checkInitialized, async (req, res) => {
    try {
        const { address } = req.params;

        if (!address) {
            return res.status(400).json({
                success: false,
                error: 'Address parameter is required'
            });
        }

        const balances = await walletIntegration.getUserBalances(address);

        res.json({
            success: true,
            data: balances
        });

    } catch (error) {
        logger.error('Failed to get user balances:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.get('/balance/:tokenAddress/:address', checkInitialized, async (req, res) => {
    try {
        const { tokenAddress, address } = req.params;

        if (!tokenAddress || !address) {
            return res.status(400).json({
                success: false,
                error: 'Token address and user address are required'
            });
        }

        const balance = await walletIntegration.getTokenBalance(tokenAddress, address);

        res.json({
            success: true,
            data: balance
        });

    } catch (error) {
        logger.error('Failed to get token balance:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.get('/transactions/:address', checkInitialized, async (req, res) => {
    try {
        const { address } = req.params;
        const { limit } = req.query;

        if (!address) {
            return res.status(400).json({
                success: false,
                error: 'Address parameter is required'
            });
        }

        const history = await walletIntegration.getTransactionHistory(
            address,
            limit ? parseInt(limit) : 50
        );

        res.json({
            success: true,
            data: history
        });

    } catch (error) {
        logger.error('Failed to get transaction history:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Transaction Monitoring
router.get('/monitor/:transactionHash', checkInitialized, async (req, res) => {
    try {
        const { transactionHash } = req.params;

        if (!transactionHash) {
            return res.status(400).json({
                success: false,
                error: 'Transaction hash is required'
            });
        }

        // Set up Server-Sent Events for real-time monitoring
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });

        // Send initial status
        res.write(`data: ${JSON.stringify({
            status: 'monitoring',
            transactionHash,
            timestamp: new Date().toISOString()
        })}\n\n`);

        // Monitor transaction and send updates
        await walletIntegration.monitorTransaction(transactionHash, (update) => {
            res.write(`data: ${JSON.stringify(update)}\n\n`);
        });

    } catch (error) {
        logger.error('Transaction monitoring failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Utility Endpoints
router.post('/validate/address', checkInitialized, async (req, res) => {
    try {
        const { address, type } = req.body;

        if (!address || !type) {
            return res.status(400).json({
                success: false,
                error: 'Address and type are required'
            });
        }

        let isValid = false;

        if (type === 'starknet') {
            isValid = walletIntegration.validateStarknetAddress(address);
        } else if (type === 'bitcoin') {
            isValid = walletIntegration.validateBitcoinAddress(address);
        } else {
            return res.status(400).json({
                success: false,
                error: 'Invalid address type. Supported types: starknet, bitcoin'
            });
        }

        res.json({
            success: true,
            data: {
                address,
                type,
                isValid
            }
        });

    } catch (error) {
        logger.error('Address validation failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Wallet Management
router.post('/disconnect', checkInitialized, async (req, res) => {
    try {
        const { address } = req.body;

        if (!address) {
            return res.status(400).json({
                success: false,
                error: 'Address is required'
            });
        }

        const result = walletIntegration.disconnectWallet(address);

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        logger.error('Wallet disconnection failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.get('/connected', checkInitialized, async (req, res) => {
    try {
        const activeWallet = walletIntegration.getConnectedWalletInfo();
        const allWallets = walletIntegration.getAllConnectedWallets();

        res.json({
            success: true,
            data: {
                activeWallet,
                connectedWallets: allWallets,
                count: allWallets.length
            }
        });

    } catch (error) {
        logger.error('Failed to get connected wallets:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;