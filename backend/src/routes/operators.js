/**
 * Bridge operators API routes
 */

const express = require('express');
const router = express.Router();
const starknetService = require('../services/starknet');
const { authenticate, requireOperator } = require('../middleware/auth');
const logger = require('../utils/logger');

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/operators
 * Get list of active bridge operators
 */
router.get('/', async (req, res) => {
    try {
        const operators = await starknetService.getActiveOperators();

        res.json({
            success: true,
            data: {
                operators,
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
 * GET /api/operators/:operatorId
 * Get specific operator information
 */
router.get('/:operatorId', async (req, res) => {
    try {
        const { operatorId } = req.params;

        const operatorInfo = await starknetService.getOperatorInfo(operatorId);

        res.json({
            success: true,
            data: operatorInfo
        });

    } catch (error) {
        logger.error('Failed to get operator info:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/operators/register
 * Register as a bridge operator (requires staking)
 */
router.post('/register', requireOperator, async (req, res) => {
    try {
        const { publicKey, bondAmount } = req.body;

        const result = await starknetService.registerOperator({
            publicKey,
            bondAmount
        });

        res.status(201).json({
            success: true,
            message: 'Operator registered successfully',
            data: result
        });

    } catch (error) {
        logger.error('Operator registration failed:', error);
        res.status(500).json({
            success: false,
            error: 'Registration failed'
        });
    }
});

module.exports = router;