// services/gateway/src/middleware/ddosProtection.js

/**
 * DDoS Protection Middleware
 * Detects and blocks malicious traffic patterns
 */
class DDoSProtection {
    constructor(redisClient) {
        this.redis = redisClient;

        // Thresholds for suspicious activity
        this.thresholds = {
            requestsPerSecond: 50,      // Suspicious if > 50 req/sec from single IP
            uniqueEndpoints: 20,         // Suspicious if hitting > 20 different endpoints
            errorRate: 0.5,              // Suspicious if > 50% requests result in errors
            suspiciousPatterns: [
                /\.\.\//,                  // Path traversal
                /<script>/i,               // XSS attempts
                /union.*select/i,          // SQL injection
                /eval\(/i,                 // Code injection
                /base64_decode/i           // Obfuscation attempts
            ]
        };
    }

    /**
     * Analyze request pattern for suspicious activity
     */
    async analyzeRequest(req) {
        const ipAddress = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        const oneMinuteAgo = now - 60000;

        // Track request metadata
        const requestData = {
            timestamp: now,
            path: req.path,
            method: req.method,
            userAgent: req.headers['user-agent'] || 'unknown'
        };

        const key = `ddos:${ipAddress}`;

        // Store request data
        await this.redis.zAdd(key, {
            score: now,
            value: JSON.stringify(requestData)
        });

        // Clean old data
        await this.redis.zRemRangeByScore(key, 0, oneMinuteAgo);
        await this.redis.expire(key, 120);

        // Get recent requests
        const recentRequests = await this.redis.zRange(key, 0, -1);

        // Analyze patterns
        const analysis = this.analyzePattern(recentRequests, ipAddress);

        return analysis;
    }

    /**
     * Analyze request patterns for anomalies
     */
    analyzePattern(requests, ipAddress) {
        if (requests.length === 0) {
            return { suspicious: false, score: 0 };
        }

        const parsedRequests = requests.map(r => {
            try {
                return JSON.parse(r);
            } catch {
                return null;
            }
        }).filter(Boolean);

        let suspicionScore = 0;
        const reasons = [];

        // Check request rate
        const requestsPerSecond = parsedRequests.length / 60;
        if (requestsPerSecond > this.thresholds.requestsPerSecond) {
            suspicionScore += 30;
            reasons.push(`High request rate: ${requestsPerSecond.toFixed(1)} req/sec`);
        }

        // Check unique endpoints
        const uniquePaths = new Set(parsedRequests.map(r => r.path));
        if (uniquePaths.size > this.thresholds.uniqueEndpoints) {
            suspicionScore += 20;
            reasons.push(`Scanning multiple endpoints: ${uniquePaths.size}`);
        }

        // Check for suspicious patterns in paths
        for (const req of parsedRequests) {
            for (const pattern of this.thresholds.suspiciousPatterns) {
                if (pattern.test(req.path)) {
                    suspicionScore += 40;
                    reasons.push(`Malicious pattern detected: ${pattern}`);
                    break;
                }
            }
        }

        // Check user agent
        const userAgents = parsedRequests.map(r => r.userAgent);
        const uniqueUserAgents = new Set(userAgents);
        if (uniqueUserAgents.size > 5) {
            suspicionScore += 15;
            reasons.push('Multiple user agents from same IP');
        }

        // Check for bot-like behavior (same user agent, rapid requests)
        const isBot = userAgents.every(ua =>
            ua === 'unknown' || ua.toLowerCase().includes('bot') || ua.toLowerCase().includes('crawler')
        );
        if (isBot && requestsPerSecond > 10) {
            suspicionScore += 25;
            reasons.push('Bot-like behavior detected');
        }

        return {
            suspicious: suspicionScore >= 50,
            score: suspicionScore,
            reasons,
            requestCount: parsedRequests.length,
            uniqueEndpoints: uniquePaths.size
        };
    }

    /**
     * Block suspicious IP
     */
    async blockSuspiciousIP(ipAddress, analysis, durationSeconds = 3600) {
        await this.redis.setEx(`blocked:ddos:${ipAddress}`, durationSeconds, JSON.stringify({
            blockedAt: Date.now(),
            reason: 'DDoS protection',
            analysis
        }));

        // Log to security events
        await this.logSecurityEvent({
            type: 'ddos_block',
            ipAddress,
            analysis,
            timestamp: Date.now()
        });
    }

    /**
     * Check if IP is blocked by DDoS protection
     */
    async isBlocked(ipAddress) {
        const blocked = await this.redis.get(`blocked:ddos:${ipAddress}`);
        if (blocked) {
            const ttl = await this.redis.ttl(`blocked:ddos:${ipAddress}`);
            return {
                blocked: true,
                ttl,
                info: JSON.parse(blocked)
            };
        }
        return { blocked: false };
    }

    /**
     * Log security event
     */
    async logSecurityEvent(event) {
        const key = 'security:events';
        await this.redis.lPush(key, JSON.stringify(event));
        await this.redis.lTrim(key, 0, 999); // Keep last 1000 events
    }

    /**
     * Get IP reputation score
     */
    async getIPReputation(ipAddress) {
        const key = `reputation:${ipAddress}`;
        const score = await this.redis.get(key);
        return parseInt(score) || 100; // Default reputation: 100
    }

    /**
     * Update IP reputation
     */
    async updateIPReputation(ipAddress, delta) {
        const key = `reputation:${ipAddress}`;
        const current = await this.getIPReputation(ipAddress);
        const newScore = Math.max(0, Math.min(100, current + delta));
        await this.redis.setEx(key, 86400, newScore.toString()); // 24 hour expiry
        return newScore;
    }
}

/**
 * DDoS protection middleware
 */
async function ddosProtectionMiddleware(req, res, next) {
    try {
        const ddos = new DDoSProtection(req.redis);
        const ipAddress = req.ip || req.connection.remoteAddress;

        // Check if IP is already blocked
        const blockStatus = await ddos.isBlocked(ipAddress);
        if (blockStatus.blocked) {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Your IP has been blocked due to suspicious activity',
                retry_after: blockStatus.ttl,
                reason: blockStatus.info.reason
            });
        }

        // Analyze current request
        const analysis = await ddos.analyzeRequest(req);

        // Block if suspicious
        if (analysis.suspicious) {
            await ddos.blockSuspiciousIP(ipAddress, analysis);

            return res.status(403).json({
                error: 'Access denied',
                message: 'Suspicious activity detected',
                reasons: analysis.reasons
            });
        }

        // Update reputation based on behavior
        if (analysis.score > 30) {
            await ddos.updateIPReputation(ipAddress, -10);
        } else if (analysis.score < 10) {
            await ddos.updateIPReputation(ipAddress, +5);
        }

        // Attach DDoS protection to request
        req.ddos = ddos;

        next();
    } catch (error) {
        console.error('DDoS protection error:', error);
        next(); // Allow request if protection fails
    }
}

/**
 * Response time monitoring
 * Blocks IPs causing slow responses (potential slowloris attack)
 */
function responseTimeMonitoring(req, res, next) {
    const startTime = Date.now();

    res.on('finish', async () => {
        const duration = Date.now() - startTime;

        // If response took > 30 seconds, it might be a slowloris attack
        if (duration > 30000 && req.ddos) {
            const ipAddress = req.ip || req.connection.remoteAddress;
            await req.ddos.updateIPReputation(ipAddress, -20);
        }
    });

    next();
}

module.exports = {
    DDoSProtection,
    ddosProtectionMiddleware,
    responseTimeMonitoring
};
