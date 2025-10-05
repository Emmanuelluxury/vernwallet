/**
 * Staking API Routes - Handles staking operations for bridge tokens
 */

const express = require('express');
const router = express.Router();
const bridgeService = require('../services/bridge');
const starknetService = require('../services/starknet');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const logger = require('../utils/logger');

// Public staking routes (no authentication required)
const publicStakingRouter = express.Router();

// Public staking configuration endpoint
publicStakingRouter.get('/config', async (req, res) => {
    try {
        const config = require('../config');

        res.json({
            success: true,
            data: {
                stakingEnabled: config.bridge.stakingEnabled,
                rewardRate: config.bridge.rewardRate,
                rewardsEnabled: config.bridge.stakingRewardsEnabled,
                supportedTokens: [
                    {
                        address: config.starknet.sbtcContractAddress,
                        symbol: 'SBTC',
                        apy: '12.5',
                        minimumStake: '0.01',
                        lockPeriods: [30, 90, 180, 365]
                    }
                ],
                globalSettings: {
                    minimumStake: '0.01',
                    maximumStake: '1000.0',
                    rewardDistribution: 'daily',
                    penaltyEnabled: true,
                    earlyUnstakePenalty: '5.0'
                }
            }
        });

    } catch (error) {
        logger.error('Failed to get staking config:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Public staking position endpoint (for basic info only)
publicStakingRouter.get('/position/:address', async (req, res) => {
    try {
        const { address } = req.params;

        if (!starknetService.isValidAddress(address)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid address'
            });
        }

        // Get basic staking position info (no sensitive data)
        let position = null;
        let rewards = null;

        try {
            position = await starknetService.getStakingPosition(address, require('../config').starknet.sbtcContractAddress);
        } catch (error) {
            logger.warn('Failed to get staking position:', error.message);
        }

        try {
            rewards = await starknetService.getUserStakingRewards(address);
        } catch (error) {
            logger.warn('Failed to get user rewards:', error.message);
        }

        res.json({
            success: true,
            data: {
                address,
                stakingPosition: position,
                rewards: rewards,
                totalStaked: position ? position.amount : '0',
                totalRewards: rewards ? rewards.rewards : '0',
                apy: '12.5'
            }
        });

    } catch (error) {
        logger.error('Failed to get staking position:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Public staking statistics endpoint
publicStakingRouter.get('/stats', async (req, res) => {
    try {
        // Get total staked amount from all positions
        const totalStaked = '0'; // TODO: Calculate from database
        const totalRewards = '0'; // TODO: Calculate from database
        const activeStakers = 0; // TODO: Count from database

        res.json({
            success: true,
            data: {
                totalStaked,
                totalRewards,
                activeStakers,
                averageStake: '0',
                totalRewardsDistributed: '0',
                apy: '12.5',
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('Failed to get staking stats:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Export main router for authenticated routes
module.exports.authenticated = router;

// Export public router for use in main server
module.exports.public = publicStakingRouter;

// All staking routes require authentication
router.use(authenticate);

/**
 * POST /api/staking/stake
 * Stake tokens to earn rewards
 */
router.post('/stake', validate({
    body: {
        tokenAddress: 'string|required',
        amount: 'number|required|min:0.00000001',
        lockPeriod: 'number|optional|min:1|max:365'
    }
}), async (req, res) => {
    try {
        const { tokenAddress, amount, lockPeriod = 30 } = req.body;
        const userAddress = req.user.address;

        logger.info('Staking request received:', {
            userAddress,
            tokenAddress,
            amount,
            lockPeriod
        });

        // Validate staking amount and token
        if (!starknetService.isValidAddress(tokenAddress)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid token address'
            });
        }

        // Check if staking is enabled
        if (!require('../config').bridge.stakingEnabled) {
            return res.status(403).json({
                success: false,
                error: 'Staking is currently disabled'
            });
        }

        // Stake tokens using bridge contract
        const result = await starknetService.stake(tokenAddress, amount);

        // Store staking record in database
        const stakingRecord = {
            userAddress,
            tokenAddress,
            amount,
            lockPeriod,
            transactionHash: result.transactionHash,
            status: 'active',
            stakedAt: new Date()
        };

        // TODO: Save to database when staking model is implemented

        res.status(201).json({
            success: true,
            message: 'Tokens staked successfully',
            data: {
                stakingId: 'staking_' + Date.now(),
                transactionHash: result.transactionHash,
                amount,
                lockPeriod,
                unlockDate: new Date(Date.now() + lockPeriod * 24 * 60 * 60 * 1000),
                expectedRewards: (amount * 0.125 * lockPeriod / 365).toFixed(8) // 12.5% APY
            }
        });

    } catch (error) {
        logger.error('Staking request failed:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Staking failed'
        });
    }
});

/**
 * POST /api/staking/unstake
 * Unstake tokens and claim rewards
 */
router.post('/unstake', validate({
    body: {
        tokenAddress: 'string|required',
        amount: 'number|required|min:0.00000001'
    }
}), async (req, res) => {
    try {
        const { tokenAddress, amount } = req.body;
        const userAddress = req.user.address;

        logger.info('Unstaking request received:', {
            userAddress,
            tokenAddress,
            amount
        });

        // Unstake tokens using bridge contract
        const result = await starknetService.unstake(tokenAddress, amount);

        res.json({
            success: true,
            message: 'Tokens unstaked successfully',
            data: {
                transactionHash: result.transactionHash,
                amount,
                rewardsClaimed: '0.0', // Will be calculated based on staking duration
                penalty: '0.0'
            }
        });

    } catch (error) {
        logger.error('Unstaking request failed:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Unstaking failed'
        });
    }
});

/**
 * POST /api/staking/claim-rewards
 * Claim staking rewards without unstaking
 */
router.post('/claim-rewards', validate({
    body: {
        tokenAddress: 'string|required'
    }
}), async (req, res) => {
    try {
        const { tokenAddress } = req.body;
        const userAddress = req.user.address;

        logger.info('Claim rewards request received:', {
            userAddress,
            tokenAddress
        });

        // Claim rewards using bridge contract
        const result = await starknetService.claimStakingRewards(tokenAddress);

        res.json({
            success: true,
            message: 'Staking rewards claimed successfully',
            data: {
                transactionHash: result.transactionHash,
                rewardsClaimed: '0.0', // Will be calculated from contract
                newStakingPosition: {
                    amount: '0.0',
                    rewards: '0.0'
                }
            }
        });

    } catch (error) {
        logger.error('Claim rewards request failed:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Claiming rewards failed'
        });
    }
});

/**
 * GET /api/staking/position/:address
 * Get staking position for an address
 */
router.get('/position/:address', async (req, res) => {
    try {
        const { address } = req.params;

        if (!starknetService.isValidAddress(address)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid address'
            });
        }

        // Get staking position from bridge contract with error handling
        let position = null;
        let rewards = null;

        try {
            position = await starknetService.getStakingPosition(address, require('../config').starknet.sbtcContractAddress);
        } catch (error) {
            logger.warn('Failed to get staking position:', error.message);
        }

        try {
            rewards = await starknetService.getUserStakingRewards(address);
        } catch (error) {
            logger.warn('Failed to get user rewards:', error.message);
        }

        res.json({
            success: true,
            data: {
                address,
                stakingPosition: position,
                rewards: rewards,
                totalStaked: position ? position.amount : '0',
                totalRewards: rewards ? rewards.rewards : '0',
                apy: '12.5'
            }
        });

    } catch (error) {
        logger.error('Failed to get staking position:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

/**
 * GET /api/staking/rewards/:address
 * Get staking rewards for an address
 */
router.get('/rewards/:address', async (req, res) => {
    try {
        const { address } = req.params;

        if (!starknetService.isValidAddress(address)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid address'
            });
        }

        const rewards = await starknetService.getUserStakingRewards(address);

        res.json({
            success: true,
            data: rewards
        });

    } catch (error) {
        logger.error('Failed to get staking rewards:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/staking/config
 * Get staking configuration
 */
router.get('/config', async (req, res) => {
    try {
        const config = require('../config');

        res.json({
            success: true,
            data: {
                stakingEnabled: config.bridge.stakingEnabled,
                rewardRate: config.bridge.rewardRate,
                rewardsEnabled: config.bridge.stakingRewardsEnabled,
                supportedTokens: [
                    {
                        address: config.starknet.sbtcContractAddress,
                        symbol: 'SBTC',
                        apy: '12.5',
                        minimumStake: '0.01',
                        lockPeriods: [30, 90, 180, 365]
                    }
                ],
                globalSettings: {
                    minimumStake: '0.01',
                    maximumStake: '1000.0',
                    rewardDistribution: 'daily',
                    penaltyEnabled: true,
                    earlyUnstakePenalty: '5.0'
                }
            }
        });

    } catch (error) {
        logger.error('Failed to get staking config:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/staking/stats
 * Get staking statistics
 */
router.get('/stats', async (req, res) => {
    try {
        // Get total staked amount from all positions
        const totalStaked = '0'; // TODO: Calculate from database
        const totalRewards = '0'; // TODO: Calculate from database
        const activeStakers = 0; // TODO: Count from database

        res.json({
            success: true,
            data: {
                totalStaked,
                totalRewards,
                activeStakers,
                averageStake: '0',
                totalRewardsDistributed: '0',
                apy: '12.5',
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('Failed to get staking stats:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/staking/history/:address
 * Get staking history for an address
 */
router.get('/history/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        // TODO: Get staking history from database
        const history = [];

        res.json({
            success: true,
            data: {
                address,
                history,
                total: history.length,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });

    } catch (error) {
        logger.error('Failed to get staking history:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
