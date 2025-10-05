/**
 * Health check routes
 */

const express = require('express');
const router = express.Router();
const bridgeService = require('../services/bridge');
const bitcoinService = require('../services/bitcoin');
const starknetService = require('../services/starknet');
const databaseService = require('../services/database');
const logger = require('../utils/logger');

/**
 * GET /health
 * Comprehensive health check
 */
router.get('/', async (req, res) => {
    try {
        const startTime = Date.now();

        // Check all services
        const [bridgeHealth, bitcoinHealth, starknetHealth, databaseHealth] = await Promise.all([
            bridgeService.healthCheck(),
            bitcoinService.healthCheck(),
            starknetService.healthCheck(),
            databaseService.healthCheck()
        ]);

        const totalResponseTime = Date.now() - startTime;

        // Determine overall health
        const services = [bridgeHealth, bitcoinHealth, starknetHealth, databaseHealth];
        const healthyServices = services.filter(s => s.status === 'healthy');
        const overallStatus = healthyServices.length === services.length ? 'healthy' :
                             healthyServices.length > 0 ? 'degraded' : 'unhealthy';

        const healthData = {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            responseTime: totalResponseTime,
            services: {
                bridge: bridgeHealth,
                bitcoin: bitcoinHealth,
                starknet: starknetHealth,
                database: databaseHealth
            },
            uptime: process.uptime(),
            version: '2.1.4',
            environment: process.env.NODE_ENV || 'development'
        };

        const statusCode = overallStatus === 'healthy' ? 200 :
                          overallStatus === 'degraded' ? 200 : 503;

        res.status(statusCode).json({
            success: true,
            data: healthData
        });

    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
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
 * GET /health/bridge
 * Bridge-specific health check
 */
router.get('/bridge', async (req, res) => {
    try {
        const health = await bridgeService.healthCheck();

        res.json({
            success: true,
            data: health
        });

    } catch (error) {
        logger.error('Bridge health check failed:', error);
        res.status(500).json({
            success: false,
            error: 'Bridge health check failed'
        });
    }
});

/**
 * GET /health/bitcoin
 * Bitcoin node health check
 */
router.get('/bitcoin', async (req, res) => {
    try {
        const health = await bitcoinService.healthCheck();

        res.json({
            success: true,
            data: health
        });

    } catch (error) {
        logger.error('Bitcoin health check failed:', error);
        res.status(500).json({
            success: false,
            error: 'Bitcoin health check failed'
        });
    }
});

/**
 * GET /health/starknet
 * Starknet node health check
 */
router.get('/starknet', async (req, res) => {
    try {
        const health = await starknetService.healthCheck();

        res.json({
            success: true,
            data: health
        });

    } catch (error) {
        logger.error('Starknet health check failed:', error);
        res.status(500).json({
            success: false,
            error: 'Starknet health check failed'
        });
    }
});

module.exports = router;