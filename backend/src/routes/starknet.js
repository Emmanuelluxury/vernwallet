/**
 * Starknet-specific API routes
 */

const express = require('express');
const router = express.Router();
const starknetService = require('../services/starknet');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/starknet/info
 * Get Starknet network information
 */
router.get('/info', async (req, res) => {
    try {
        const info = await starknetService.getNetworkInfo();

        res.json({
            success: true,
            data: info
        });

    } catch (error) {
        logger.error('Failed to get Starknet info:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/starknet/account/:address
 * Get Starknet account information
 */
router.get('/account/:address', async (req, res) => {
    try {
        const { address } = req.params;

        const balance = await starknetService.getSBTCBalance(address);
        const networkInfo = await starknetService.getNetworkInfo();

        res.json({
            success: true,
            data: {
                address,
                balance,
                network: networkInfo,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('Failed to get Starknet account info:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/starknet/call
 * Call Starknet contract (read-only)
 */
router.post('/call', async (req, res) => {
    try {
        const { contractAddress, functionName, inputs = [] } = req.body;

        // TODO: Implement contract call functionality
        logger.info(`Starknet contract call: ${contractAddress}.${functionName}`);

        res.json({
            success: true,
            data: {
                result: [],
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('Starknet contract call failed:', error);
        res.status(500).json({
            success: false,
            error: 'Contract call failed'
        });
    }
});

module.exports = router;