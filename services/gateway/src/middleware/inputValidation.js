// services/gateway/src/middleware/inputValidation.js
const validator = require('validator');

/**
 * Input Validation & Sanitization Middleware
 * Prevents SQL injection, XSS, NoSQL injection, command injection, and path traversal
 */

/**
 * SQL Injection Prevention
 * Detects and blocks SQL injection attempts
 */
function detectSQLInjection(input) {
    if (typeof input !== 'string') return false;

    const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\s+(FROM|INTO|TABLE|DATABASE|PROCEDURE)\b)/i,
        /(UNION\s+ALL\s+SELECT)/i,
        /(\bOR\s+\d+\s*=\s*\d+)/i,
        /(\bAND\s+\d+\s*=\s*\d+)/i,
        /('|"|;|--|\/\*|\*\/)\s*(OR|AND|UNION|SELECT|INSERT|UPDATE|DELETE)/i,
        /(xp_cmdshell|sp_executesql)/i
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * XSS Prevention
 * Detects and sanitizes XSS attempts
 */
function detectXSS(input) {
    if (typeof input !== 'string') return false;

    const xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
        /javascript:[^\s]*/gi,
        /on\w+\s*=/gi,  // Event handlers like onclick=
        /<img[^>]+src[^>]*>/gi,
        /<object\b/gi,
        /<embed\b/gi
    ];

    return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * NoSQL Injection Prevention
 * Detects MongoDB injection attempts
 */
function detectNoSQLInjection(input) {
    if (typeof input === 'object') {
        const jsonStr = JSON.stringify(input);
        const noSqlPatterns = [
            /"\$where"/i,
            /"\$ne"/i,
            /"\$gt"/i,
            /"\$lt"/i,
            /"\$regex"/i,
            /"\$or"/i,
            /"\$and"/i
        ];
        return noSqlPatterns.some(pattern => pattern.test(jsonStr));
    }
    return false;
}

/**
 * Command Injection Prevention
 */
function detectCommandInjection(input) {
    if (typeof input !== 'string') return false;

    const cmdPatterns = [
        /(;|\||`|\$|\(|\)|&{2})\s*(cat|ls|pwd|whoami|wget|curl|nc|netcat|bash|sh|cmd|powershell)\b/i,
        /(\.\.\/|\.\.\\)/
    ];

    return cmdPatterns.some(pattern => pattern.test(input));
}

/**
 * Path Traversal Prevention
 */
function detectPathTraversal(input) {
    if (typeof input !== 'string') return false;

    const pathPatterns = [
        /\.\.\//,
        /\.\.\\/,
        /%2e%2e%2f/i,
        /%2e%2e\\/i,
        /\.\.%2f/i
    ];

    return pathPatterns.some(pattern => pattern.test(input));
}

/**
 * Sanitize string input
 */
function sanitizeString(input) {
    if (typeof input !== 'string') return input;

    // Remove null bytes
    let sanitized = input.replace(/\0/g, '');

    // Escape HTML entities
    sanitized = validator.escape(sanitized);

    // Trim whitespace
    sanitized = sanitized.trim();

    return sanitized;
}

/**
 * Validate and sanitize object recursively
 */
function sanitizeObject(obj, depth = 0) {
    if (depth > 10) return obj; // Prevent deep recursion attacks

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item, depth + 1));
    }

    if (obj && typeof obj === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            // Sanitize key
            const sanitizedKey = sanitizeString(key);

            // Sanitize value
            if (typeof value === 'string') {
                sanitized[sanitizedKey] = sanitizeString(value);
            } else if (typeof value === 'object') {
                sanitized[sanitizedKey] = sanitizeObject(value, depth + 1);
            } else {
                sanitized[sanitizedKey] = value;
            }
        }
        return sanitized;
    }

    return obj;
}

/**
 * Input validation middleware
 */
function inputValidationMiddleware(req, res, next) {
    try {
        const violations = [];

        // Check query parameters
        for (const [key, value] of Object.entries(req.query || {})) {
            if (detectSQLInjection(value)) {
                violations.push({ field: `query.${key}`, type: 'SQL Injection' });
            }
            if (detectXSS(value)) {
                violations.push({ field: `query.${key}`, type: 'XSS' });
            }
            if (detectCommandInjection(value)) {
                violations.push({ field: `query.${key}`, type: 'Command Injection' });
            }
            if (detectPathTraversal(value)) {
                violations.push({ field: `query.${key}`, type: 'Path Traversal' });
            }
        }

        // Check body parameters
        if (req.body) {
            const checkBody = (obj, path = 'body') => {
                for (const [key, value] of Object.entries(obj)) {
                    const fieldPath = `${path}.${key}`;

                    if (typeof value === 'string') {
                        if (detectSQLInjection(value)) {
                            violations.push({ field: fieldPath, type: 'SQL Injection' });
                        }
                        if (detectXSS(value)) {
                            violations.push({ field: fieldPath, type: 'XSS' });
                        }
                        if (detectCommandInjection(value)) {
                            violations.push({ field: fieldPath, type: 'Command Injection' });
                        }
                        if (detectPathTraversal(value)) {
                            violations.push({ field: fieldPath, type: 'Path Traversal' });
                        }
                    } else if (typeof value === 'object' && value !== null) {
                        if (detectNoSQLInjection(value)) {
                            violations.push({ field: fieldPath, type: 'NoSQL Injection' });
                        }
                        checkBody(value, fieldPath);
                    }
                }
            };

            checkBody(req.body);
        }

        // If violations found, block request
        if (violations.length > 0) {
            // Log security event
            console.error('Security violation detected:', {
                ip: req.ip,
                path: req.path,
                violations
            });

            // Update IP reputation if available
            if (req.ddos) {
                req.ddos.updateIPReputation(req.ip, -30);
            }

            return res.status(400).json({
                error: 'Invalid input',
                message: 'Potentially malicious input detected',
                violations: violations.map(v => v.type)
            });
        }

        // Sanitize inputs
        req.query = sanitizeObject(req.query);
        req.body = sanitizeObject(req.body);

        next();
    } catch (error) {
        console.error('Input validation error:', error);
        next();
    }
}

/**
 * Parameterized query helper for SQL
 * Prevents SQL injection by using parameterized queries
 */
class SafeQuery {
    static buildQuery(template, params) {
        // Ensure params are properly escaped
        const escapedParams = params.map(param => {
            if (typeof param === 'string') {
                // Remove dangerous characters
                return param.replace(/['";\\]/g, '');
            }
            return param;
        });

        return { query: template, params: escapedParams };
    }
}

/**
 * Content Security Policy headers
 */
function cspMiddleware(req, res, next) {
    res.setHeader('Content-Security-Policy', [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'"
    ].join('; '));

    // Additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    next();
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    return validator.isEmail(email);
}

/**
 * Validate URL format
 */
function isValidURL(url) {
    return validator.isURL(url, {
        protocols: ['http', 'https'],
        require_protocol: true
    });
}

/**
 * Validate UUID format
 */
function isValidUUID(uuid) {
    return validator.isUUID(uuid);
}

module.exports = {
    inputValidationMiddleware,
    cspMiddleware,
    detectSQLInjection,
    detectXSS,
    detectNoSQLInjection,
    detectCommandInjection,
    detectPathTraversal,
    sanitizeString,
    sanitizeObject,
    SafeQuery,
    isValidEmail,
    isValidURL,
    isValidUUID
};
