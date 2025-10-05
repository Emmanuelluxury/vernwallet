/**
 * Bridge API Routes - Handles bridge operations between Bitcoin and Starknet
 */

const express = require('express');
const router = express.Router();
const bridgeService = require('../services/bridge');
const starknetService = require('../services/starknet');
const bitcoinService = require('../services/bitcoin');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const logger = require('../utils/logger');

// All bridge routes require authentication
router.use(authenticate);

/**
 * POST /api/bridge/deposit
 * Initiate a new Bitcoin to Starknet deposit
 */
router.post('/deposit', validate({
    body: {
        btcTxHash: 'string|required',
        amount: 'number|required|min:0.00000001',
        starknetRecipient: 'string|required',
        confirmations: 'number|optional|min:1|max:100'
    }
}), async (req, res) => {
    try {
        const { btcTxHash, amount, starknetRecipient, confirmations } = req.body;

        logger.info('Deposit request received:', {
            btcTxHash,
            amount,
            starknetRecipient,
            userId: req.user.id
        });

        // Add to processing queue
        const deposit = await bridgeService.createDeposit({
            btcTxHash,
            amount,
            starknetRecipient,
            confirmations: confirmations || 6,
            userId: req.user.id
        });

        res.status(201).json({
            success: true,
            message: 'Deposit request submitted successfully',
            data: {
                depositId: deposit.id,
                btcTxHash,
                amount,
                status: 'pending',
                estimatedTime: '5-10 minutes'
            }
        });

    } catch (error) {
        logger.error('Deposit request failed:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/bridge/withdrawal
 * Initiate a new Starknet to Bitcoin withdrawal
 */
router.post('/withdrawal', validate({
    body: {
        amount: 'number|required|min:0.00000001',
        btcRecipient: 'string|required',
        starknetSender: 'string|required'
    }
}), async (req, res) => {
    try {
        const { amount, btcRecipient, starknetSender } = req.body;

        logger.info('Withdrawal request received:', {
            amount,
            btcRecipient,
            starknetSender,
            userId: req.user.id
        });

        // Validate withdrawal request
        const validation = await bridgeService.validateWithdrawalRequest(
            null, // Will be generated
            amount,
            btcRecipient,
            starknetSender
        );

        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: validation.error
            });
        }

        // Create withdrawal request
        const withdrawal = await bridgeService.createWithdrawal({
            amount,
            btcRecipient,
            starknetSender,
            userId: req.user.id
        });

        res.status(201).json({
            success: true,
            message: 'Withdrawal request submitted successfully',
            data: {
                withdrawalId: withdrawal.id,
                amount,
                btcRecipient,
                status: 'pending',
                estimatedTime: '10-30 minutes'
            }
        });

    } catch (error) {
        logger.error('Withdrawal request failed:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/bridge/deposit/:txHash
 * Get deposit status by Bitcoin transaction hash
 */
router.get('/deposit/:txHash', async (req, res) => {
    try {
        const { txHash } = req.params;

        // Get from database first
        const depositRecord = await bridgeService.getDepositRecord(txHash);

        if (depositRecord) {
            return res.json({
                success: true,
                data: {
                    btcTxHash: depositRecord.btc_tx_hash,
                    amount: parseFloat(depositRecord.amount),
                    starknetRecipient: depositRecord.starknet_recipient,
                    starknetTxHash: depositRecord.starknet_tx_hash,
                    status: depositRecord.status,
                    confirmations: depositRecord.confirmations,
                    createdAt: depositRecord.created_at,
                    completedAt: depositRecord.completed_at,
                    failedAt: depositRecord.failed_at,
                    errorMessage: depositRecord.error_message
                }
            });
        }

        // If not in database, check if it's a valid Bitcoin transaction
        const txValidation = await bridgeService.validateBitcoinTransaction(txHash, 0, 1);
        if (!txValidation.valid && txValidation.error === 'Transaction not found') {
            return res.status(404).json({
                success: false,
                error: 'Deposit not found'
            });
        }

        res.json({
            success: true,
            data: {
                btcTxHash: txHash,
                status: 'detected',
                message: 'Transaction found, processing pending'
            }
        });

    } catch (error) {
        logger.error('Failed to get deposit status:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/bridge/withdrawal/:withdrawalId
 * Get withdrawal status by withdrawal ID
 */
router.get('/withdrawal/:withdrawalId', async (req, res) => {
    try {
        const { withdrawalId } = req.params;

        const withdrawalRecord = await bridgeService.getWithdrawalRecord(withdrawalId);

        if (!withdrawalRecord) {
            return res.status(404).json({
                success: false,
                error: 'Withdrawal not found'
            });
        }

        res.json({
            success: true,
            data: {
                withdrawalId: withdrawalRecord.withdrawal_id,
                amount: parseFloat(withdrawalRecord.amount),
                btcRecipient: withdrawalRecord.btc_recipient,
                starknetSender: withdrawalRecord.starknet_sender,
                starknetTxHash: withdrawalRecord.starknet_tx_hash,
                status: withdrawalRecord.status,
                createdAt: withdrawalRecord.created_at,
                completedAt: withdrawalRecord.completed_at,
                failedAt: withdrawalRecord.failed_at,
                errorMessage: withdrawalRecord.error_message
            }
        });

    } catch (error) {
        logger.error('Failed to get withdrawal status:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/bridge/stats
 * Get bridge statistics and metrics
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await bridgeService.getBridgeStats();

        // Get additional real-time data with error handling
        let bitcoinInfo = { status: 'unknown', error: 'Service unavailable' };
        let starknetInfo = { status: 'unknown', error: 'Service unavailable' };

        try {
            bitcoinInfo = await bitcoinService.getNetworkInfo();
        } catch (error) {
            logger.warn('Failed to get Bitcoin network info:', error.message);
        }

        try {
            starknetInfo = await starknetService.getNetworkInfo();
        } catch (error) {
            logger.warn('Failed to get Starknet network info:', error.message);
        }

        res.json({
            success: true,
            data: {
                ...stats,
                networks: {
                    bitcoin: bitcoinInfo,
                    starknet: starknetInfo
                },
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('Failed to get bridge stats:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

/**
 * GET /api/bridge/operators
 * Get list of active bridge operators
 */
router.get('/operators', async (req, res) => {
    try {
        const operators = await starknetService.getActiveOperators();

        const operatorDetails = await Promise.all(
            operators.map(async (op) => {
                try {
                    const info = await starknetService.getOperatorInfo(op.operatorId);
                    return { ...op, ...info };
                } catch (error) {
                    logger.error(`Failed to get operator ${op.operatorId} info:`, error);
                    return { ...op, error: error.message };
                }
            })
        );

        res.json({
            success: true,
            data: {
                operators: operatorDetails,
                total: operators.length,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('Failed to get operators:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/bridge/sbtc/balance/:address
 * Get SBTC balance for a Starknet address
 */
router.get('/sbtc/balance/:address', async (req, res) => {
    try {
        const { address } = req.params;

        const balance = await starknetService.getSBTCBalance(address);

        res.json({
            success: true,
            data: balance
        });

    } catch (error) {
        logger.error('Failed to get SBTC balance:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/bridge/sbtc/mint
 * Mint SBTC tokens (operator only)
 */
router.post('/sbtc/mint', validate({
    body: {
        recipient: 'string|required',
        amount: 'number|required|min:0.00000001'
    }
}), async (req, res) => {
    try {
        // Check if user is an operator
        if (!req.user.isOperator) {
            return res.status(403).json({
                success: false,
                error: 'Operator access required'
            });
        }

        const { recipient, amount } = req.body;

        const result = await starknetService.mintSBTC(recipient, amount);

        res.json({
            success: true,
            message: 'SBTC minted successfully',
            data: {
                recipient,
                amount,
                transactionHash: result.transactionHash
            }
        });

    } catch (error) {
        logger.error('Failed to mint SBTC:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/bridge/sbtc/burn
 * Burn SBTC tokens (for withdrawals)
 */
router.post('/sbtc/burn', validate({
    body: {
        amount: 'number|required|min:0.00000001'
    }
}), async (req, res) => {
    try {
        const { amount } = req.body;

        const result = await starknetService.burnSBTC(amount);

        res.json({
            success: true,
            message: 'SBTC burned successfully',
            data: {
                amount,
                transactionHash: result.transactionHash
            }
        });

    } catch (error) {
        logger.error('Failed to burn SBTC:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/bridge/health
 * Get detailed bridge health status
 */
router.get('/health', async (req, res) => {
    try {
        const health = await bridgeService.healthCheck();

        const statusCode = health.status === 'healthy' ? 200 :
                          health.status === 'degraded' ? 200 : 500;

        res.status(statusCode).json({
            success: true,
            data: health
        });

    } catch (error) {
        logger.error('Bridge health check failed:', error);
        res.status(500).json({
            success: false,
            error: 'Health check failed',
            data: {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            }
        });
    }
});

/**
 * GET /api/bridge/networks
 * Get status of both Bitcoin and Starknet networks
 */
router.get('/networks', async (req, res) => {
    try {
        const [bitcoinInfo, starknetInfo] = await Promise.all([
            bitcoinService.getNetworkInfo(),
            starknetService.getNetworkInfo()
        ]);

        res.json({
            success: true,
            data: {
                bitcoin: bitcoinInfo,
                starknet: starknetInfo,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('Failed to get network status:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/bridge/test
 * Test bridge functionality (development only)
 */
if (process.env.NODE_ENV === 'development') {
    router.post('/test', async (req, res) => {
        try {
            // Create a test deposit
            const testDeposit = {
                btcTxHash: '0x' + Math.random().toString(16).substring(2, 66),
                amount: Math.random() * 0.1 + 0.01,
                starknetRecipient: '0x' + Math.random().toString(16).substring(2, 66)
            };

            const result = await bridgeService.processDeposit(testDeposit);

            res.json({
                success: true,
                message: 'Test deposit processed',
                data: result
            });

        } catch (error) {
            logger.error('Test bridge failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });
}

module.exports = router;