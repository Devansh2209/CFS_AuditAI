// services/security-auth-service/src/jwt.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * JWT Service for token generation and validation
 * Supports token refresh and blacklisting
 */
class JWTService {
    constructor(secretKey, redisClient) {
        this.secretKey = secretKey || process.env.JWT_SECRET;
        this.tokenExpiry = process.env.JWT_EXPIRY || '24h';
        this.refreshExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
        this.redis = redisClient;

        if (!this.secretKey) {
            throw new Error('JWT_SECRET environment variable is required');
        }
    }

    /**
     * Generate access token
     */
    generateToken(user) {
        const payload = {
            user_id: user.id,
            email: user.email,
            role: user.role || 'user',
            tier: user.subscription_tier || 'free',
            iat: Math.floor(Date.now() / 1000),
            jti: crypto.randomBytes(16).toString('hex')
        };

        return jwt.sign(payload, this.secretKey, {
            expiresIn: this.tokenExpiry,
            issuer: 'cashflowai.com',
            audience: 'api.cashflowai.com',
            algorithm: 'HS256'
        });
    }

    /**
     * Verify and decode token
     */
    async verifyToken(token) {
        try {
            const decoded = jwt.verify(token, this.secretKey, {
                issuer: 'cashflowai.com',
                audience: 'api.cashflowai.com',
                algorithms: ['HS256']
            });

            // Check if token is blacklisted
            if (this.redis) {
                const isBlacklisted = await this.redis.get(`blacklist:${decoded.jti}`);
                if (isBlacklisted) {
                    throw new Error('Token has been revoked');
                }
            }

            return decoded;
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('Token has expired');
            } else if (error.name === 'JsonWebTokenError') {
                throw new Error('Invalid token');
            } else {
                throw error;
            }
        }
    }

    /**
     * Revoke token (add to blacklist)
     */
    async revokeToken(token) {
        try {
            const decoded = jwt.decode(token);

            if (!decoded || !decoded.jti) {
                throw new Error('Invalid token format');
            }

            if (this.redis) {
                const ttl = decoded.exp - Math.floor(Date.now() / 1000);
                if (ttl > 0) {
                    await this.redis.setEx(`blacklist:${decoded.jti}`, ttl, '1');
                }
            }

            return { success: true, message: 'Token revoked successfully' };
        } catch (error) {
            throw new Error('Failed to revoke token: ' + error.message);
        }
    }
}

module.exports = JWTService;
