/**
 * Request validation middleware
 */

/**
 * Simple validation function for request data
 */
const validate = (rules) => {
    return (req, res, next) => {
        const errors = [];

        // Validate body parameters
        if (rules.body) {
            for (const [field, rule] of Object.entries(rules.body)) {
                const value = req.body[field];

                if (rule.includes('required') && (value === undefined || value === null || value === '')) {
                    errors.push(`${field} is required`);
                    continue;
                }

                if (value !== undefined && value !== null) {
                    if (rule.includes('string') && typeof value !== 'string') {
                        errors.push(`${field} must be a string`);
                    }

                    if (rule.includes('number')) {
                        const num = parseFloat(value);
                        if (isNaN(num)) {
                            errors.push(`${field} must be a valid number`);
                        } else {
                            if (rule.includes('min:') && num < parseFloat(rule.split('min:')[1])) {
                                errors.push(`${field} must be at least ${rule.split('min:')[1]}`);
                            }
                            if (rule.includes('max:') && num > parseFloat(rule.split('max:')[1])) {
                                errors.push(`${field} must be at most ${rule.split('max:')[1]}`);
                            }
                        }
                    }

                    if (rule.includes('min:') && value.length < parseInt(rule.split('min:')[1])) {
                        errors.push(`${field} must be at least ${rule.split('min:')[1]} characters`);
                    }

                    if (rule.includes('max:') && value.length > parseInt(rule.split('max:')[1])) {
                        errors.push(`${field} must be at most ${rule.split('max:')[1]} characters`);
                    }
                }
            }
        }

        // Validate query parameters
        if (rules.query) {
            for (const [field, rule] of Object.entries(rules.query)) {
                const value = req.query[field];

                if (rule.includes('required') && (value === undefined || value === null || value === '')) {
                    errors.push(`${field} query parameter is required`);
                    continue;
                }

                if (value !== undefined && value !== null) {
                    if (rule.includes('number')) {
                        const num = parseFloat(value);
                        if (isNaN(num)) {
                            errors.push(`${field} must be a valid number`);
                        }
                    }
                }
            }
        }

        // Validate path parameters
        if (rules.params) {
            for (const [field, rule] of Object.entries(rules.params)) {
                const value = req.params[field];

                if (rule.includes('required') && (value === undefined || value === null || value === '')) {
                    errors.push(`${field} path parameter is required`);
                    continue;
                }

                if (value !== undefined && value !== null) {
                    if (rule.includes('number')) {
                        const num = parseFloat(value);
                        if (isNaN(num)) {
                            errors.push(`${field} must be a valid number`);
                        }
                    }
                }
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors
            });
        }

        next();
    };
};

/**
 * Sanitize input data
 */
const sanitize = (req, res, next) => {
    // Basic sanitization - remove potential XSS
    const sanitizeString = (str) => {
        if (typeof str !== 'string') return str;
        return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    };

    if (req.body) {
        for (const [key, value] of Object.entries(req.body)) {
            if (typeof value === 'string') {
                req.body[key] = sanitizeString(value);
            }
        }
    }

    if (req.query) {
        for (const [key, value] of Object.entries(req.query)) {
            if (typeof value === 'string') {
                req.query[key] = sanitizeString(value);
            }
        }
    }

    next();
};

/**
 * Rate limiting validation
 */
const checkRateLimit = (req, res, next) => {
    // Basic rate limiting check
    // In production, use Redis or database for distributed rate limiting

    const clientIp = req.ip || req.connection.remoteAddress;
    const key = `rate_limit:${clientIp}`;

    // For development, skip rate limiting
    if (process.env.NODE_ENV === 'development') {
        return next();
    }

    // TODO: Implement proper rate limiting with Redis
    next();
};

module.exports = {
    validate,
    sanitize,
    checkRateLimit
};