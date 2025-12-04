// services/gateway/src/middleware/rateLimiter.js
let Redis;
try {
    Redis = require('redis');
} catch (e) {
    // Mock Redis for local testing without dependencies
    Redis = {
        createClient: () => ({
            connect: async () => { },
            on: () => { },
            zAdd: async () => { },
            zRemRangeByScore: async () => { },
            zCard: async () => 0,
            expire: async () => { },
            get: async () => null,
            setEx: async () => { },
            del: async () => { },
            incr: async () => 1,
            ttl: async () => 0
        })
    };
}

/**
 * Rate Limiter using Redis with sliding window algorithm
 * Supports tier-based limits and IP-based blocking
 */
class RateLimiter {
    constructor(redisClient) {
        this.redis = redisClient;

        // Rate limits per tier (requests per minute)
        this.limits = {
            free: 100,
            pro: 1000,
            enterprise: 10000,
            unauthenticated: 20  // Very restrictive for unauthenticated requests
        };

        // IP blocking thresholds
        this.ipBlockThreshold = 5;  // Failed attempts before block
        this.ipBlockDuration = 900; // 15 minutes in seconds
    }

    /**
     * Check rate limit for user
     * Uses sliding window algorithm for accurate rate limiting
     */
    async checkLimit(userId, tier = 'free') {
        const now = Date.now();
        const window = 60000; // 1 minute window
        const key = `rate_limit:user:${userId}`;

        // Add current request timestamp
        await this.redis.zAdd(key, { score: now, value: `${now}` });

        // Remove old entries outside the window
        const windowStart = now - window;
        await this.redis.zRemRangeByScore(key, 0, windowStart);

        // Count requests in current window
        const count = await this.redis.zCard(key);

        // Set expiry on the key
        await this.redis.expire(key, 120); // 2 minutes

        const limit = this.limits[tier] || this.limits.free;

        if (count > limit) {
            throw new Error(`Rate limit exceeded: ${limit} requests per minute`);
        }

        return {
            limit,
            remaining: Math.max(0, limit - count),
            reset: now + window,
            current: count
        };
    }

    /**
     * Check rate limit by IP address (for unauthenticated requests)
     */
    async checkIPLimit(ipAddress) {
        const now = Date.now();
        const window = 60000;
        const key = `rate_limit:ip:${ipAddress}`;

        // Check if IP is blocked
        const blocked = await this.redis.get(`blocked:${ipAddress}`);
        if (blocked) {
            const ttl = await this.redis.ttl(`blocked:${ipAddress}`);
            throw new Error(`IP address blocked. Try again in ${Math.ceil(ttl / 60)} minutes`);
        }

        await this.redis.zAdd(key, { score: now, value: `${now}` });

        const windowStart = now - window;
        await this.redis.zRemRangeByScore(key, 0, windowStart);

        const count = await this.redis.zCard(key);
        await this.redis.expire(key, 120);

        const limit = this.limits.unauthenticated;

        if (count > limit) {
            throw new Error(`Rate limit exceeded for IP: ${limit} requests per minute`);
        }

        return {
            limit,
            remaining: Math.max(0, limit - count),
            reset: now + window,
            current: count
        };
    }

    /**
     * Record failed authentication attempt
     * Blocks IP after threshold is reached
     */
    async recordFailedAuth(ipAddress) {
        const key = `failed_auth:${ipAddress}`;
        const count = await this.redis.incr(key);

        if (count === 1) {
            await this.redis.expire(key, 300); // 5 minute window
        }

        if (count >= this.ipBlockThreshold) {
            await this.redis.setEx(
                `blocked:${ipAddress}`,
                this.ipBlockDuration,
                '1'
            );
            await this.redis.del(key);
            return { blocked: true, duration: this.ipBlockDuration };
        }

        return { blocked: false, attempts: count, threshold: this.ipBlockThreshold };
    }

    /**
     * Clear failed authentication attempts (on successful login)
     */
    async clearFailedAuth(ipAddress) {
        await this.redis.del(`failed_auth:${ipAddress}`);
    }

    /**
     * Get rate limit info without incrementing
     */
    async getRateLimitInfo(userId, tier = 'free') {
        const now = Date.now();
        const window = 60000;
        const key = `rate_limit:user:${userId}`;

        const count = await this.redis.zCard(key) || 0;
        const limit = this.limits[tier] || this.limits.free;

        return {
            limit,
            remaining: Math.max(0, limit - count),
            reset: now + window,
            current: count
        };
    }

    /**
     * Manually block an IP address
     */
    async blockIP(ipAddress, durationSeconds = 3600) {
        await this.redis.setEx(`blocked:${ipAddress}`, durationSeconds, '1');
        return { blocked: true, duration: durationSeconds };
    }

    /**
     * Unblock an IP address
     */
    async unblockIP(ipAddress) {
        await this.redis.del(`blocked:${ipAddress}`);
        return { unblocked: true };
    }

    /**
     * Check if IP is blocked
     */
    async isIPBlocked(ipAddress) {
        const blocked = await this.redis.get(`blocked:${ipAddress}`);
        if (blocked) {
            const ttl = await this.redis.ttl(`blocked:${ipAddress}`);
            return { blocked: true, ttl };
        }
        return { blocked: false };
    }
}

/**
 * Rate limiting middleware for Express
 */
async function rateLimitMiddleware(req, res, next) {
    try {
        const rateLimiter = new RateLimiter(req.redis);

        // Get client IP
        const ipAddress = req.ip || req.connection.remoteAddress;

        // Check if IP is blocked
        const ipStatus = await rateLimiter.isIPBlocked(ipAddress);
        if (ipStatus.blocked) {
            return res.status(429).json({
                error: 'Too many requests',
                message: `Your IP has been temporarily blocked. Try again in ${Math.ceil(ipStatus.ttl / 60)} minutes`,
                retry_after: ipStatus.ttl
            });
        }

        let rateInfo;

        // Check rate limit based on authentication
        if (req.user) {
            // Authenticated request - use user-based rate limiting
            const tier = req.user.tier || 'free';
            rateInfo = await rateLimiter.checkLimit(req.user.user_id, tier);
        } else {
            // Unauthenticated request - use IP-based rate limiting
            rateInfo = await rateLimiter.checkIPLimit(ipAddress);
        }

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', rateInfo.limit);
        res.setHeader('X-RateLimit-Remaining', rateInfo.remaining);
        res.setHeader('X-RateLimit-Reset', new Date(rateInfo.reset).toISOString());

        // Attach rate limiter to request for use in auth failures
        req.rateLimiter = rateLimiter;

        next();
    } catch (error) {
        if (error.message.includes('Rate limit exceeded') || error.message.includes('blocked')) {
            return res.status(429).json({
                error: 'Too many requests',
                message: error.message,
                retry_after: 60
            });
        }

        // If Redis is down, allow request but log error
        console.error('Rate limiter error:', error);
        next();
    }
}

/**
 * Burst protection middleware
 * Prevents sudden spikes in traffic
 */
async function burstProtectionMiddleware(req, res, next) {
    try {
        const rateLimiter = new RateLimiter(req.redis);
        const userId = req.user?.user_id || req.ip;
        const key = `burst:${userId}`;

        // Allow max 10 requests per second
        const now = Date.now();
        const oneSecondAgo = now - 1000;

        await req.redis.zAdd(key, { score: now, value: `${now}` });
        await req.redis.zRemRangeByScore(key, 0, oneSecondAgo);

        const count = await req.redis.zCard(key);
        await req.redis.expire(key, 2);

        if (count > 10) {
            return res.status(429).json({
                error: 'Too many requests',
                message: 'Request burst detected. Maximum 10 requests per second',
                retry_after: 1
            });
        }

        next();
    } catch (error) {
        console.error('Burst protection error:', error);
        next();
    }
}

module.exports = {
    RateLimiter,
    rateLimitMiddleware,
    burstProtectionMiddleware
};
