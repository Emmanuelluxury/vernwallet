/**
 * Bitcoin Node API Routes
 * Handles Bitcoin network interactions and queries
 */

const express = require('express');
const router = express.Router();
const bitcoinService = require('../services/bitcoin');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

/**
 * GET /api/bitcoin/network
 * Get Bitcoin network information
 */
router.get('/network', authenticate, async (req, res) => {
    try {
        const networkInfo = await bitcoinService.getNetworkInfo();

        res.json({
            success: true,
            data: {
                network: networkInfo
            }
        });
    } catch (error) {
        console.error('Error getting Bitcoin network info:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get Bitcoin network information'
        });
    }
});

/**
 * GET /api/bitcoin/address/:address/balance
 * Get Bitcoin address balance
 */
router.get('/address/:address/balance', authenticate, validate({
    params: {
        address: { type: 'string', required: true }
    }
}), async (req, res) => {
    try {
        const { address } = req.params;

        // Validate Bitcoin address format
        if (!bitcoinService.isValidAddress(address)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Bitcoin address format'
            });
        }

        const balance = await bitcoinService.getAddressBalance(address);

        res.json({
            success: true,
            data: {
                address,
                balance: balance.toString(),
                balanceSat: balance
            }
        });
    } catch (error) {
        console.error('Error getting Bitcoin address balance:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get Bitcoin address balance'
        });
    }
});

/**
 * GET /api/bitcoin/transaction/:txHash
 * Get Bitcoin transaction details
 */
router.get('/transaction/:txHash', authenticate, validate({
    params: {
        txHash: { type: 'string', required: true }
    }
}), async (req, res) => {
    try {
        const { txHash } = req.params;

        const transaction = await bitcoinService.getTransaction(txHash);

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }

        res.json({
            success: true,
            data: {
                transaction
            }
        });
    } catch (error) {
        console.error('Error getting Bitcoin transaction:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get Bitcoin transaction'
        });
    }
});

/**
 * GET /api/bitcoin/block/:blockHash
 * Get Bitcoin block details
 */
router.get('/block/:blockHash', authenticate, validate({
    params: {
        blockHash: { type: 'string', required: true }
    }
}), async (req, res) => {
    try {
        const { blockHash } = req.params;

        const block = await bitcoinService.getBlock(blockHash);

        if (!block) {
            return res.status(404).json({
                success: false,
                error: 'Block not found'
            });
        }

        res.json({
            success: true,
            data: {
                block
            }
        });
    } catch (error) {
        console.error('Error getting Bitcoin block:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get Bitcoin block'
        });
    }
});

/**
 * GET /api/bitcoin/latest-block
 * Get latest Bitcoin block
 */
router.get('/latest-block', authenticate, async (req, res) => {
    try {
        const latestBlock = await bitcoinService.getLatestBlock();

        res.json({
            success: true,
            data: {
                block: latestBlock
            }
        });
    } catch (error) {
        console.error('Error getting latest Bitcoin block:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get latest Bitcoin block'
        });
    }
});

/**
 * POST /api/bitcoin/broadcast
 * Broadcast Bitcoin transaction
 */
router.post('/broadcast', authenticate, validate({
    body: {
        rawTransaction: { type: 'string', required: true }
    }
}), async (req, res) => {
    try {
        const { rawTransaction } = req.body;

        const txHash = await bitcoinService.broadcastTransaction(rawTransaction);

        res.json({
            success: true,
            data: {
                txHash,
                message: 'Transaction broadcast successfully'
            }
        });
    } catch (error) {
        console.error('Error broadcasting Bitcoin transaction:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to broadcast Bitcoin transaction'
        });
    }
});

/**
 * GET /api/bitcoin/fee-estimates
 * Get Bitcoin fee estimates
 */
router.get('/fee-estimates', authenticate, async (req, res) => {
    try {
        const feeEstimates = await bitcoinService.getFeeEstimates();

        res.json({
            success: true,
            data: {
                feeEstimates
            }
        });
    } catch (error) {
        console.error('Error getting Bitcoin fee estimates:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get Bitcoin fee estimates'
        });
    }
});

/**
 * GET /api/bitcoin/mempool
 * Get Bitcoin mempool information
 */
router.get('/mempool', authenticate, async (req, res) => {
    try {
        const mempoolInfo = await bitcoinService.getMempoolInfo();

        res.json({
            success: true,
            data: {
                mempool: mempoolInfo
            }
        });
    } catch (error) {
        console.error('Error getting Bitcoin mempool info:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get Bitcoin mempool information'
        });
    }
});

module.exports = router;