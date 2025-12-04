// services/gateway/src/middleware/auth.js
const JWTService = require('../../../security-auth-service/src/jwt');
const APIKeyService = require('../../../security-auth-service/src/apiKeys');

/**
 * Authentication middleware
 * Supports both JWT tokens and API keys
 */
async function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                error: 'Authentication required',
                message: 'Provide Authorization header with Bearer token or API key',
                docs: 'https://docs.cashflowai.com/authentication'
            });
        }

        // JWT Bearer token authentication
        if (authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const jwtService = new JWTService(process.env.JWT_SECRET, req.redis);

            try {
                const decoded = await jwtService.verifyToken(token);

                req.user = {
                    user_id: decoded.user_id,
                    email: decoded.email,
                    role: decoded.role,
                    tier: decoded.tier
                };
                req.authType = 'jwt';
                req.authToken = token;

                return next();
            } catch (error) {
                return res.status(401).json({
                    error: 'Invalid token',
                    message: error.message
                });
            }
        }

        // API key authentication
        if (authHeader.startsWith('sk_live_')) {
            const apiKeyService = new APIKeyService(req.db);

            try {
                const keyInfo = await apiKeyService.validateAPIKey(authHeader);

                req.user = {
                    user_id: keyInfo.user_id,
                    tier: keyInfo.rate_limit > 100 ? 'pro' : 'free',
                    scopes: keyInfo.scopes
                };
                req.authType = 'api_key';
                req.apiKeyId = keyInfo.id;
                req.rateLimit = keyInfo.rate_limit;

                return next();
            } catch (error) {
                return res.status(401).json({
                    error: 'Invalid API key',
                    message: error.message
                });
            }
        }

        return res.status(401).json({
            error: 'Invalid authentication format',
            message: 'Use "Bearer {token}" or provide API key directly'
        });

    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(500).json({
            error: 'Authentication failed',
            message: 'Internal server error'
        });
    }
}

/**
 * Optional authentication middleware
 * Allows unauthenticated requests but populates req.user if auth is provided
 */
async function optionalAuthMiddleware(req, res, next) {
    if (!req.headers.authorization) {
        req.user = null;
        req.authType = 'none';
        return next();
    }

    return authMiddleware(req, res, next);
}

/**
 * Role-based access control middleware
 */
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Authentication required'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: `This endpoint requires one of the following roles: ${allowedRoles.join(', ')}`
            });
        }

        next();
    };
}

/**
 * Scope-based access control for API keys
 */
function requireScope(...requiredScopes) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Authentication required'
            });
        }

        // JWT tokens have full access
        if (req.authType === 'jwt') {
            return next();
        }

        // Check API key scopes
        const userScopes = req.user.scopes || [];
        const hasRequiredScope = requiredScopes.some(scope =>
            userScopes.includes(scope) || userScopes.includes('*')
        );

        if (!hasRequiredScope) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                message: `This endpoint requires one of the following scopes: ${requiredScopes.join(', ')}`,
                your_scopes: userScopes
            });
        }

        next();
    };
}

module.exports = {
    authMiddleware,
    optionalAuthMiddleware,
    requireRole,
    requireScope
};
