/**
 * Global error handling middleware
 */

const logger = require('../utils/logger');

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
    logger.error('Unhandled error:', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.id
    });

    // Don't expose stack traces in production
    const isDevelopment = process.env.NODE_ENV === 'development';

    res.status(err.status || 500).json({
        success: false,
        error: isDevelopment ? err.message : 'Internal server error',
        ...(isDevelopment && { stack: err.stack }),
        requestId: req.id,
        timestamp: new Date().toISOString()
    });
};

/**
 * 404 handler
 */
const notFound = (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path,
        method: req.method,
        requestId: req.id,
        timestamp: new Date().toISOString()
    });
};

/**
 * Async error wrapper
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Custom error class
 */
class AppError extends Error {
    constructor(message, status = 500) {
        super(message);
        this.name = 'AppError';
        this.status = status;
    }
}

module.exports = {
    errorHandler,
    notFound,
    asyncHandler,
    AppError
};