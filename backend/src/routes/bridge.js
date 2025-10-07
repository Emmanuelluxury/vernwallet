/**
 * Enhanced Bridge API Routes with Starknet Contract Integration
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
 * Initiate a new Bitcoin to Starknet deposit via Cairo contract
 */
router.post('/deposit', validate({
    body: {
        amount: 'number|required|min:0.00000001',
        btcAddress: 'string|required',
        starknetRecipient: 'string|required'
    }
}), async (req, res) => {
    try {
        const { amount, btcAddress, starknetRecipient } = req.body;

        logger.info('Contract deposit request received:', {
            amount,
            btcAddress,
            starknetRecipient,
            userId: req.user.id
        });

        // Validate addresses
        if (!isValidBitcoinAddress(btcAddress)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Bitcoin address format'
            });
        }

        if (!isValidStarknetAddress(starknetRecipient)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Starknet address format'
            });
        }

        // Call Starknet contract via service
        const result = await starknetService.initiateBitcoinDeposit(
            amount,
            btcAddress,
            starknetRecipient
        );

        res.status(201).json({
            success: true,
            message: 'Deposit initiated on Starknet contract',
            data: {
                depositId: result.depositId,
                transactionHash: result.transactionHash,
                amount,
                status: 'initiated',
                estimatedTime: '5-10 minutes'
            }
        });

    } catch (error) {
        logger.error('Contract deposit request failed:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/bridge/withdrawal
 * Initiate a new Starknet to Bitcoin withdrawal via Cairo contract
 */
router.post('/withdrawal', validate({
    body: {
        amount: 'number|required|min:0.00000001',
        btcRecipient: 'string|required'
    }
}), async (req, res) => {
    try {
        const { amount, btcRecipient } = req.body;

        logger.info('Contract withdrawal request received:', {
            amount,
            btcRecipient,
            userId: req.user.id
        });

        // Validate Bitcoin address
        if (!isValidBitcoinAddress(btcRecipient)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Bitcoin address format'
            });
        }

        // Call Starknet contract via service
        const result = await starknetService.initiateBitcoinWithdrawal(
            amount,
            btcRecipient
        );

        res.status(201).json({
            success: true,
            message: 'Withdrawal initiated on Starknet contract',
            data: {
                withdrawalId: result.withdrawalId,
                transactionHash: result.transactionHash,
                amount,
                status: 'initiated',
                estimatedTime: '10-30 minutes'
            }
        });

    } catch (error) {
        logger.error('Contract withdrawal request failed:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/bridge/stake
 * Stake tokens via Cairo contract
 */
router.post('/stake', validate({
    body: {
        token: 'string|required',
        amount: 'number|required|min:0.00000001'
    }
}), async (req, res) => {
    try {
        const { token, amount } = req.body;

        const result = await starknetService.stakeTokens(token, amount);

        res.json({
            success: true,
            message: 'Tokens staked successfully',
            data: {
                transactionHash: result.transactionHash,
                amount
            }
        });

    } catch (error) {
        logger.error('Staking failed:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/bridge/unstake
 * Unstake tokens via Cairo contract
 */
router.post('/unstake', validate({
    body: {
        token: 'string|required',
        amount: 'number|required|min:0.00000001'
    }
}), async (req, res) => {
    try {
        const { token, amount } = req.body;

        const result = await starknetService.unstakeTokens(token, amount);

        res.json({
            success: true,
            message: 'Tokens unstaked successfully',
            data: {
                transactionHash: result.transactionHash,
                amount
            }
        });

    } catch (error) {
        logger.error('Unstaking failed:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/bridge/claim-rewards
 * Claim staking rewards via Cairo contract
 */
router.post('/claim-rewards', validate({
    body: {
        token: 'string|required'
    }
}), async (req, res) => {
    try {
        const { token } = req.body;

        const result = await starknetService.claimRewards(token);

        res.json({
            success: true,
            message: 'Rewards claimed successfully',
            data: {
                transactionHash: result.transactionHash
            }
        });

    } catch (error) {
        logger.error('Claim rewards failed:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/bridge/staking/:user/:token
 * Get staking position from Cairo contract
 */
router.get('/staking/:user/:token', async (req, res) => {
    try {
        const { user, token } = req.params;

        const position = await starknetService.getStakingPosition(user, token);

        res.json({
            success: true,
            data: position
        });

    } catch (error) {
        logger.error('Failed to get staking position:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Helper functions
function isValidBitcoinAddress(address) {
    const legacyRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
    const bech32Regex = /^bc1[a-z0-9]{39,59}$/;
    return legacyRegex.test(address) || bech32Regex.test(address);
}

function isValidStarknetAddress(address) {
    const starknetRegex = /^0x[a-fA-F0-9]{64}$/;
    return starknetRegex.test(address) && address !== '0x' + '0'.repeat(64);
}

// ... keep the rest of your existing routes for stats, health, etc.

module.exports = router;