/**
 * Authentication middleware for bridge API
 */

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const authenticate = async (req, res, next) => {
    try {
        // For development, allow requests without authentication
        // In production, implement proper JWT or wallet signature validation

        if (process.env.NODE_ENV === 'development') {
            // Mock user for development
            req.user = {
                id: 'dev-user-123',
                address: '0x1234567890abcdef1234567890abcdef12345678',
                isOperator: false
            };
            return next();
        }

        // Check for API key
        const apiKey = req.headers['x-api-key'];
        if (apiKey && apiKey === process.env.BRIDGE_API_KEY) {
            req.user = {
                id: 'api-user',
                address: req.headers['x-wallet-address'] || '0x0',
                isOperator: false
            };
            return next();
        }

        // Check for wallet signature
        const walletAddress = req.headers['x-wallet-address'];
        const signature = req.headers['x-signature'];

        if (walletAddress && signature) {
            // TODO: Implement proper wallet signature verification
            req.user = {
                id: `wallet-${walletAddress}`,
                address: walletAddress,
                isOperator: false
            };
            return next();
        }

        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });

    } catch (error) {
        logger.error('Authentication error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication failed'
        });
    }
};

const requireOperator = (req, res, next) => {
    if (!req.user || !req.user.isOperator) {
        return res.status(403).json({
            success: false,
            error: 'Operator access required'
        });
    }
    next();
};

module.exports = {
    authenticate,
    requireOperator
};