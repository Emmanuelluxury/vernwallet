/**
 * VernWallet Bridge Backend API
 * Main entry point for the bridge API server
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { notFound } = require('./middleware/notFound');

// Import routes
const authRoutes = require('./routes/auth');
const bridgeRoutes = require('./routes/bridge');
const { authenticated: stakingRoutes, public: publicStakingRoutes } = require('./routes/staking');
const bitcoinRoutes = require('./routes/bitcoin');
const starknetRoutes = require('./routes/starknet');
const operatorRoutes = require('./routes/operators');
const healthRoutes = require('./routes/health');
const websocketRoutes = require('./routes/websocket');
const walletIntegrationRoutes = require('./routes/wallet-integration');

class BridgeAPI {
    constructor() {
        this.app = express();
        this.server = null;
        this.port = config.api.port;

        this.initializeMiddleware();
        this.initializeRoutes();
        this.initializeErrorHandling();
        this.initializeWebSocket();

        // Graceful shutdown
        process.on('SIGTERM', () => this.gracefulShutdown());
        process.on('SIGINT', () => this.gracefulShutdown());
    }

    initializeMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
                    scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
                    fontSrc: ["'self'", "https://fonts.gstatic.com"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'", "ws:", "wss:"],
                },
            },
        }));

        // CORS configuration
        this.app.use(cors({
            origin: config.api.corsOrigins,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
        }));

        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: config.api.rateLimitPerMinute,
            message: {
                error: 'Too many requests from this IP, please try again later.'
            },
            standardHeaders: true,
            legacyHeaders: false,
        });
        this.app.use('/api/', limiter);

        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Compression
        this.app.use(compression());

        // Logging
        if (config.env === 'development') {
            this.app.use(morgan('dev'));
        } else {
            this.app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
        }

        // Request ID middleware
        this.app.use((req, res, next) => {
            req.id = require('uuid').v4();
            res.setHeader('X-Request-ID', req.id);
            next();
        });
    }

    initializeRoutes() {
        // Health check endpoint (no auth required)
        this.app.use('/health', healthRoutes);

        // Public API routes (no authentication required) - must be registered BEFORE authenticated routes
        this.app.use('/api/staking/config', publicStakingRoutes);
        this.app.use('/api/staking/position', publicStakingRoutes);
        this.app.use('/api/staking/stats', publicStakingRoutes);

        // API routes with authentication
        this.app.use('/api/auth', authRoutes);
        this.app.use('/api/bridge', bridgeRoutes);
        this.app.use('/api/staking', stakingRoutes);
        this.app.use('/api/bitcoin', bitcoinRoutes);
        this.app.use('/api/starknet', starknetRoutes);
        this.app.use('/api/operators', operatorRoutes);
        this.app.use('/api/wallet', walletIntegrationRoutes);

        // WebSocket upgrade - handle WebSocket connections before other routes
        this.app.use('/ws', (req, res, next) => {
            // Handle WebSocket upgrade requests
            if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
                // Let the WebSocket server handle the upgrade
                return next();
            }
            // For non-WebSocket requests, use the router
            return websocketRoutes(req, res, next);
        });

        // API documentation
        if (config.env === 'development') {
            this.app.use('/api-docs', require('./routes/docs'));
        }

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                name: 'VernWallet Bridge API',
                version: '1.0.0',
                status: 'running',
                timestamp: new Date().toISOString(),
                environment: config.env,
                endpoints: {
                    health: '/health',
                    api: '/api',
                    docs: config.env === 'development' ? '/api-docs' : 'N/A'
                }
            });
        });
    }

    initializeErrorHandling() {
        // 404 handler
        this.app.use(notFound);

        // Global error handler
        this.app.use(errorHandler);
    }

    initializeWebSocket() {
        const WebSocket = require('ws');
        const server = require('http').createServer(this.app);

        this.wss = new WebSocket.Server({
            server,
            path: '/ws',
            verifyClient: (info) => {
                // Add WebSocket authentication logic here
                return true;
            }
        });

        this.wss.on('connection', (ws, req) => {
            logger.info(`WebSocket client connected: ${req.socket.remoteAddress}`);

            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    this.handleWebSocketMessage(ws, data);
                } catch (error) {
                    logger.error('WebSocket message error:', error);
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Invalid message format'
                    }));
                }
            });

            ws.on('close', () => {
                logger.info('WebSocket client disconnected');
            });

            ws.on('error', (error) => {
                logger.error('WebSocket error:', error);
            });

            // Send welcome message
            ws.send(JSON.stringify({
                type: 'welcome',
                message: 'Connected to VernWallet Bridge WebSocket',
                timestamp: new Date().toISOString()
            }));
        });

        this.server = server;
    }

    handleWebSocketMessage(ws, data) {
        switch (data.type) {
            case 'subscribe':
                this.handleSubscription(ws, data);
                break;
            case 'unsubscribe':
                this.handleUnsubscription(ws, data);
                break;
            case 'ping':
                ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
                break;
            default:
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Unknown message type'
                }));
        }
    }

    handleSubscription(ws, data) {
        const { channel } = data;

        // Add client to subscription list
        if (!this.subscriptions) {
            this.subscriptions = new Map();
        }

        if (!this.subscriptions.has(channel)) {
            this.subscriptions.set(channel, new Set());
        }

        this.subscriptions.get(channel).add(ws);

        ws.send(JSON.stringify({
            type: 'subscribed',
            channel,
            timestamp: new Date().toISOString()
        }));

        logger.info(`WebSocket client subscribed to channel: ${channel}`);
    }

    handleUnsubscription(ws, data) {
        const { channel } = data;

        if (this.subscriptions && this.subscriptions.has(channel)) {
            this.subscriptions.get(channel).delete(ws);

            ws.send(JSON.stringify({
                type: 'unsubscribed',
                channel,
                timestamp: new Date().toISOString()
            }));
        }
    }

    broadcastToChannel(channel, data) {
        if (this.subscriptions && this.subscriptions.has(channel)) {
            const message = JSON.stringify({
                type: 'broadcast',
                channel,
                data,
                timestamp: new Date().toISOString()
            });

            this.subscriptions.get(channel).forEach(ws => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(message);
                }
            });
        }
    }

    async start() {
        try {
            // Initialize database connection
            await require('./services/database').initialize();

            // Initialize blockchain connections
            await require('./services/bitcoin').initialize();
            await require('./services/starknet').initialize();

            // Initialize bridge service
            await require('./services/bridge').initialize();

            // Initialize wallet integration service
            await require('./services/wallet-integration').initialize();

            // Start server
            this.server.listen(this.port, () => {
                logger.info(`🚀 VernWallet Bridge API started on port ${this.port}`);
                logger.info(`📊 Environment: ${config.env}`);
                logger.info(`🔗 Health check: http://localhost:${this.port}/health`);

                if (config.env === 'development') {
                    logger.info(`📚 API Documentation: http://localhost:${this.port}/api-docs`);
                }
            });

        } catch (error) {
            logger.error('Failed to start server:', error);
            process.exit(1);
        }
    }

    async gracefulShutdown() {
        logger.info('Received shutdown signal, gracefully shutting down...');

        try {
            // Close WebSocket connections
            if (this.wss) {
                this.wss.close();
            }

            // Close server
            if (this.server) {
                this.server.close();
            }

            // Close database connections
            await require('./services/database').close();

            logger.info('Graceful shutdown completed');
            process.exit(0);

        } catch (error) {
            logger.error('Error during shutdown:', error);
            process.exit(1);
        }
    }
}

// Start the server
if (require.main === module) {
    const api = new BridgeAPI();
    api.start();
}

module.exports = BridgeAPI;