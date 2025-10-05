/**
 * WebSocket routes and handlers
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * WebSocket upgrade handler
 * This handles the initial WebSocket connection upgrade
 */
router.get('/', (req, res) => {
    // WebSocket upgrade is handled in the main server file
    // This route is just for documentation purposes
    res.json({
        success: true,
        message: 'WebSocket endpoint',
        events: [
            'bridge_update',
            'staking_reward',
            'transaction_confirmed',
            'operator_joined',
            'system_alert'
        ]
    });
});

/**
 * WebSocket upgrade endpoint for Express
 * This handles WebSocket upgrade requests
 */
router.get('/upgrade', (req, res) => {
    // Set appropriate headers for WebSocket upgrade
    res.setHeader('Upgrade', 'websocket');
    res.setHeader('Connection', 'Upgrade');
    res.setHeader('Sec-WebSocket-Accept', generateWebSocketAcceptKey(req.headers['sec-websocket-key']));

    // WebSocket upgrade is handled in the main server file
    res.status(101).send('Switching Protocols');
});

/**
 * Generate WebSocket accept key
 */
function generateWebSocketAcceptKey(key) {
    const crypto = require('crypto');
    const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
    return crypto.createHash('sha1').update(key + GUID).digest('base64');
}

/**
 * WebSocket event handlers
 * These are called from the main server WebSocket connection handler
 */

class WebSocketManager {
    constructor() {
        this.connections = new Map();
        this.subscriptions = new Map();
    }

    handleConnection(ws, req) {
        const connectionId = req.headers['sec-websocket-key'] || Date.now().toString();
        this.connections.set(connectionId, ws);

        logger.info(`WebSocket client connected: ${connectionId}`);

        ws.on('close', () => {
            this.handleDisconnection(connectionId);
        });

        ws.on('error', (error) => {
            logger.error(`WebSocket error for ${connectionId}:`, error);
            this.handleDisconnection(connectionId);
        });

        // Send welcome message
        this.sendToConnection(connectionId, {
            type: 'welcome',
            message: 'Connected to VernWallet Bridge WebSocket',
            connectionId,
            timestamp: new Date().toISOString()
        });
    }

    handleDisconnection(connectionId) {
        logger.info(`WebSocket client disconnected: ${connectionId}`);
        this.connections.delete(connectionId);

        // Remove from all subscriptions
        for (const [channel, subscribers] of this.subscriptions) {
            subscribers.delete(connectionId);
        }
    }

    handleMessage(connectionId, message) {
        try {
            const data = JSON.parse(message);
            const ws = this.connections.get(connectionId);

            if (!ws) return;

            switch (data.type) {
                case 'subscribe':
                    this.handleSubscription(connectionId, data.channel);
                    break;
                case 'unsubscribe':
                    this.handleUnsubscription(connectionId, data.channel);
                    break;
                case 'ping':
                    this.sendToConnection(connectionId, {
                        type: 'pong',
                        timestamp: new Date().toISOString()
                    });
                    break;
                default:
                    this.sendToConnection(connectionId, {
                        type: 'error',
                        message: 'Unknown message type',
                        timestamp: new Date().toISOString()
                    });
            }
        } catch (error) {
            logger.error('WebSocket message error:', error);
            this.sendToConnection(connectionId, {
                type: 'error',
                message: 'Invalid message format',
                timestamp: new Date().toISOString()
            });
        }
    }

    handleSubscription(connectionId, channel) {
        if (!this.subscriptions.has(channel)) {
            this.subscriptions.set(channel, new Set());
        }

        this.subscriptions.get(channel).add(connectionId);

        this.sendToConnection(connectionId, {
            type: 'subscribed',
            channel,
            timestamp: new Date().toISOString()
        });

        logger.info(`WebSocket client ${connectionId} subscribed to channel: ${channel}`);
    }

    handleUnsubscription(connectionId, channel) {
        if (this.subscriptions.has(channel)) {
            this.subscriptions.get(channel).delete(connectionId);

            this.sendToConnection(connectionId, {
                type: 'unsubscribed',
                channel,
                timestamp: new Date().toISOString()
            });
        }
    }

    broadcastToChannel(channel, data) {
        if (this.subscriptions.has(channel)) {
            const message = JSON.stringify({
                type: 'broadcast',
                channel,
                data,
                timestamp: new Date().toISOString()
            });

            for (const connectionId of this.subscriptions.get(channel)) {
                const ws = this.connections.get(connectionId);
                if (ws && ws.readyState === 1) { // WebSocket.OPEN
                    ws.send(message);
                }
            }
        }
    }

    sendToConnection(connectionId, data) {
        const ws = this.connections.get(connectionId);
        if (ws && ws.readyState === 1) {
            ws.send(JSON.stringify(data));
        }
    }

    // Bridge-specific broadcast methods
    broadcastBridgeUpdate(transactionId, status, progress) {
        this.broadcastToChannel('bridge_updates', {
            type: 'bridge_update',
            transactionId,
            status,
            progress,
            timestamp: new Date().toISOString()
        });
    }

    broadcastStakingReward(address, amount, tokenAddress) {
        this.broadcastToChannel('staking_rewards', {
            type: 'staking_reward',
            address,
            amount,
            tokenAddress,
            timestamp: new Date().toISOString()
        });
    }

    broadcastTransactionConfirmed(txHash, network) {
        this.broadcastToChannel('transactions', {
            type: 'transaction_confirmed',
            txHash,
            network,
            timestamp: new Date().toISOString()
        });
    }

    broadcastSystemAlert(type, message, severity = 'info') {
        this.broadcastToChannel('system_alerts', {
            type: 'system_alert',
            alertType: type,
            message,
            severity,
            timestamp: new Date().toISOString()
        });
    }
}

// Export WebSocket manager instance
const wsManager = new WebSocketManager();
module.exports = router;
module.exports.wsManager = wsManager;