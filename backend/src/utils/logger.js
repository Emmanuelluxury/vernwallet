/**
 * Logging utility for the bridge application
 */

const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Configure Winston logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'bridge-api' },
    transports: [
        // Write all logs with importance level of `error` or less to `error.log`
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Write all logs with importance level of `info` or less to `combined.log`
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
    ],
});

// If we're not in production then also log to the console
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

// Create additional loggers for different purposes
const bridgeLogger = logger.child({ component: 'bridge' });
const bitcoinLogger = logger.child({ component: 'bitcoin' });
const starknetLogger = logger.child({ component: 'starknet' });
const stakingLogger = logger.child({ component: 'staking' });

module.exports = logger;
module.exports.bridgeLogger = bridgeLogger;
module.exports.bitcoinLogger = bitcoinLogger;
module.exports.starknetLogger = starknetLogger;
module.exports.stakingLogger = stakingLogger;