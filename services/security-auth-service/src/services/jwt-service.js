const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { logger } = require('@cfs/common-utils');

class JWTService {
    constructor() {
        this.secret = process.env.JWT_SECRET || 'development_secret_do_not_use_in_production';
        this.expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    }

    generateToken(user) {
        try {
            return jwt.sign(
                {
                    userId: user.id,
                    username: user.username,
                    role: user.role,
                    permissions: user.permissions
                },
                this.secret,
                { expiresIn: this.expiresIn }
            );
        } catch (error) {
            logger.error('Error generating token', error);
            throw error;
        }
    }

    verifyToken(token) {
        try {
            return jwt.verify(token, this.secret);
        } catch (error) {
            logger.warn('Invalid token verification attempt', { error: error.message });
            throw new Error('Invalid token');
        }
    }

    async hashPassword(password) {
        return bcrypt.hash(password, 12);
    }

    async verifyPassword(password, hash) {
        return bcrypt.compare(password, hash);
    }
}

module.exports = new JWTService();
