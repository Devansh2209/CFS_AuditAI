const jwt = require('jsonwebtoken');
const logger = require('../logger');

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ error: 'Authorization header missing' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Bearer token missing' });
        }

        const secret = process.env.JWT_SECRET || 'development_secret_do_not_use_in_production';
        const decoded = jwt.verify(token, secret);

        req.user = decoded;
        next();
    } catch (error) {
        logger.warn('Authentication failed', { error: error.message, ip: req.ip });
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

module.exports = authMiddleware;
