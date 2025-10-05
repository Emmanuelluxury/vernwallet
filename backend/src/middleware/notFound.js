/**
 * 404 Not Found middleware
 */

/**
 * Handle 404 errors for unmatched routes
 */
const notFound = (req, res, next) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path,
        method: req.method,
        requestId: req.id,
        timestamp: new Date().toISOString(),
        suggestion: 'Check the API documentation for available endpoints'
    });
};

module.exports = { notFound };