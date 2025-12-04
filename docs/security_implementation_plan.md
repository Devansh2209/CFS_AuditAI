# Phase 1: Security & Infrastructure Implementation Plan

## Overview
**Goal**: Implement enterprise-grade security features to protect data, prevent unauthorized access, and ensure compliance with GDPR/SOC 2 standards.

**Timeline**: 3-4 weeks  
**Priority**: CRITICAL (Blocker for commercial launch)

---

## User Review Required

> [!IMPORTANT]
> **Breaking Changes**
> - All API endpoints will require authentication (JWT or API key)
> - Existing unauthenticated access will be deprecated
> - Migration period: 30 days with deprecation warnings

> [!WARNING]
> **Security Decisions**
> - JWT tokens expire after 24 hours (configurable)
> - API keys can be revoked instantly
> - Rate limits: Free tier (100 req/min), Pro tier (1000 req/min)
> - Failed auth attempts trigger temporary IP blocks (5 failures = 15 min block)

---

## Proposed Changes

### Component 1: Authentication & Authorization

#### [NEW] [auth-service/jwt.js](file:///Users/devanshsoni/Desktop/Cashflow/services/security-auth-service/src/jwt.js)

**Purpose**: JWT token generation and validation

**Implementation**:
```javascript
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class JWTService {
  constructor(secretKey) {
    this.secretKey = secretKey || process.env.JWT_SECRET;
    this.tokenExpiry = process.env.JWT_EXPIRY || '24h';
  }

  generateToken(user) {
    const payload = {
      user_id: user.id,
      email: user.email,
      role: user.role,
      tier: user.subscription_tier,
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, this.secretKey, {
      expiresIn: this.tokenExpiry,
      issuer: 'cashflowai.com',
      audience: 'api.cashflowai.com'
    });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.secretKey, {
        issuer: 'cashflowai.com',
        audience: 'api.cashflowai.com'
      });
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  refreshToken(oldToken) {
    const decoded = this.verifyToken(oldToken);
    delete decoded.iat;
    delete decoded.exp;
    return this.generateToken(decoded);
  }
}

module.exports = JWTService;
```

---

#### [NEW] [auth-service/apiKeys.js](file:///Users/devanshsoni/Desktop/Cashflow/services/security-auth-service/src/apiKeys.js)

**Purpose**: API key generation and management

**Database Schema**:
```sql
CREATE TABLE api_keys (
    id SERIAL PRIMARY KEY,
    key_id VARCHAR(32) UNIQUE NOT NULL,
    key_hash VARCHAR(128) NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    scopes JSONB DEFAULT '[]',
    rate_limit INTEGER DEFAULT 100,
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_api_keys_key_id ON api_keys(key_id);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
```

**Implementation**:
```javascript
const crypto = require('crypto');
const bcrypt = require('bcrypt');

class APIKeyService {
  generateAPIKey() {
    const keyId = crypto.randomBytes(16).toString('hex');
    const secret = crypto.randomBytes(32).toString('hex');
    const apiKey = `sk_live_${keyId}_${secret}`;
    
    return {
      apiKey,
      keyId,
      keyHash: bcrypt.hashSync(apiKey, 10)
    };
  }

  async validateAPIKey(apiKey, db) {
    const keyId = apiKey.split('_')[2];
    
    const result = await db.query(
      'SELECT * FROM api_keys WHERE key_id = $1 AND revoked_at IS NULL',
      [keyId]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid API key');
    }

    const key = result.rows[0];
    
    if (key.expires_at && new Date(key.expires_at) < new Date()) {
      throw new Error('API key expired');
    }

    const isValid = await bcrypt.compare(apiKey, key.key_hash);
    if (!isValid) {
      throw new Error('Invalid API key');
    }

    await db.query(
      'UPDATE api_keys SET last_used_at = NOW() WHERE id = $1',
      [key.id]
    );

    return key;
  }
}

module.exports = APIKeyService;
```

---

#### [MODIFY] [gateway/middleware/auth.js](file:///Users/devanshsoni/Desktop/Cashflow/services/gateway/src/middleware/auth.js)

**Purpose**: Authentication middleware for API gateway

**Implementation**:
```javascript
const JWTService = require('../../security-auth-service/src/jwt');
const APIKeyService = require('../../security-auth-service/src/apiKeys');

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Provide JWT token or API key'
      });
    }

    // JWT authentication
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const jwtService = new JWTService();
      const decoded = jwtService.verifyToken(token);
      
      req.user = decoded;
      req.authType = 'jwt';
      return next();
    }

    // API key authentication
    if (authHeader.startsWith('sk_live_')) {
      const apiKeyService = new APIKeyService();
      const key = await apiKeyService.validateAPIKey(authHeader, req.db);
      
      req.user = {
        user_id: key.user_id,
        tier: key.tier,
        scopes: key.scopes
      };
      req.authType = 'api_key';
      req.apiKeyId = key.id;
      return next();
    }

    return res.status(401).json({
      error: 'Invalid authentication format'
    });

  } catch (error) {
    return res.status(401).json({
      error: 'Authentication failed',
      message: error.message
    });
  }
}

module.exports = authMiddleware;
```

---

### Component 2: Rate Limiting & DDoS Protection

#### [NEW] [gateway/middleware/rateLimiter.js](file:///Users/devanshsoni/Desktop/Cashflow/services/gateway/src/middleware/rateLimiter.js)

**Purpose**: Redis-based rate limiting

**Database Schema (Redis)**:
```
Key: rate_limit:{user_id}:{window}
Value: request_count
TTL: 60 seconds (1 minute window)
```

**Implementation**:
```javascript
const Redis = require('redis');

class RateLimiter {
  constructor(redisClient) {
    this.redis = redisClient;
    this.limits = {
      free: 100,      // 100 req/min
      pro: 1000,      // 1000 req/min
      enterprise: 10000  // 10000 req/min
    };
  }

  async checkLimit(userId, tier) {
    const window = Math.floor(Date.now() / 60000);
    const key = `rate_limit:${userId}:${window}`;
    
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, 60);
    }

    const limit = this.limits[tier] || this.limits.free;
    
    if (current > limit) {
      throw new Error(`Rate limit exceeded: ${limit} requests per minute`);
    }

    return {
      limit,
      remaining: limit - current,
      reset: (window + 1) * 60000
    };
  }
}

async function rateLimitMiddleware(req, res, next) {
  try {
    const rateLimiter = new RateLimiter(req.redis);
    const tier = req.user.tier || 'free';
    
    const rateInfo = await rateLimiter.checkLimit(req.user.user_id, tier);
    
    res.setHeader('X-RateLimit-Limit', rateInfo.limit);
    res.setHeader('X-RateLimit-Remaining', rateInfo.remaining);
    res.setHeader('X-RateLimit-Reset', rateInfo.reset);
    
    next();
  } catch (error) {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: error.message,
      retry_after: 60
    });
  }
}

module.exports = { RateLimiter, rateLimitMiddleware };
```

---

### Component 3: Data Encryption

#### [NEW] [shared/encryption.js](file:///Users/devanshsoni/Desktop/Cashflow/services/shared/encryption.js)

**Purpose**: AES-256 encryption for sensitive data

**Implementation**:
```javascript
const crypto = require('crypto');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  }

  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  decrypt(encrypted, iv, authTag) {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

module.exports = EncryptionService;
```

---

### Component 4: GDPR Compliance

#### [NEW] [gdpr/dataRetention.js](file:///Users/devanshsoni/Desktop/Cashflow/services/shared/gdpr/dataRetention.js)

**Purpose**: Automated data deletion for GDPR compliance

**Database Schema**:
```sql
CREATE TABLE data_deletion_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    requested_at TIMESTAMP DEFAULT NOW(),
    scheduled_for TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending'
);

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    retention_until TIMESTAMP NOT NULL
);
```

**Implementation**:
```javascript
class GDPRService {
  async requestDataDeletion(userId, db) {
    const scheduledFor = new Date();
    scheduledFor.setDate(scheduledFor.getDate() + 30);
    
    await db.query(`
      INSERT INTO data_deletion_requests (user_id, scheduled_for)
      VALUES ($1, $2)
    `, [userId, scheduledFor]);
    
    return {
      message: 'Data deletion scheduled',
      scheduled_for: scheduledFor,
      note: 'You have 30 days to cancel this request'
    };
  }

  async executeDataDeletion(userId, db) {
    await db.query('BEGIN');
    
    try {
      await db.query('DELETE FROM transactions WHERE user_id = $1', [userId]);
      await db.query('DELETE FROM custom_rules WHERE client_id = $1', [userId]);
      await db.query('DELETE FROM api_keys WHERE user_id = $1', [userId]);
      
      await db.query(`
        UPDATE data_deletion_requests 
        SET completed_at = NOW(), status = 'completed'
        WHERE user_id = $1
      `, [userId]);
      
      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  async cleanupOldAuditLogs(db) {
    await db.query(`
      DELETE FROM audit_logs 
      WHERE retention_until < NOW()
    `);
  }
}

module.exports = GDPRService;
```

---

### Component 5: AWS Security Hardening

#### [NEW] [infrastructure/aws-security.tf](file:///Users/devanshsoni/Desktop/Cashflow/infrastructure/aws-security.tf)

**Purpose**: Terraform configuration for AWS security

**Implementation**:
```hcl
# VPC with private subnets
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "cashflow-ai-vpc"
  }
}

# Private subnet for databases
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 1}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "cashflow-ai-private-${count.index + 1}"
  }
}

# Security group for RDS
resource "aws_security_group" "rds" {
  name        = "cashflow-ai-rds"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Enable GuardDuty
resource "aws_guardduty_detector" "main" {
  enable = true
}

# Enable CloudTrail
resource "aws_cloudtrail" "main" {
  name                          = "cashflow-ai-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_logging                = true
}

# Secrets Manager for API keys
resource "aws_secretsmanager_secret" "jwt_secret" {
  name = "cashflow-ai/jwt-secret"
}

resource "aws_secretsmanager_secret" "encryption_key" {
  name = "cashflow-ai/encryption-key"
}
```

---

## Verification Plan

### Automated Tests

1. **Authentication Tests**
   ```bash
   npm test -- auth.test.js
   ```
   - JWT generation and validation
   - API key creation and validation
   - Token expiration handling
   - Invalid token rejection

2. **Rate Limiting Tests**
   ```bash
   npm test -- rateLimiter.test.js
   ```
   - Respect tier limits
   - Reset after window
   - Concurrent request handling

3. **Encryption Tests**
   ```bash
   npm test -- encryption.test.js
   ```
   - Encrypt/decrypt round-trip
   - Different data types
   - Large payloads

### Manual Verification

1. **Security Audit**
   - Run OWASP ZAP scan
   - Check for SQL injection vulnerabilities
   - Test XSS prevention

2. **Penetration Testing**
   - Attempt brute force attacks
   - Test rate limit bypass
   - Check for authentication bypass

3. **Compliance Check**
   - GDPR data deletion workflow
   - Audit log retention
   - Data encryption at rest

---

## Timeline

### Week 1: Authentication & Authorization
- Day 1-2: JWT service implementation
- Day 3-4: API key management
- Day 5: Authentication middleware

### Week 2: Rate Limiting & Encryption
- Day 1-2: Redis rate limiter
- Day 3-4: Encryption service
- Day 5: Integration testing

### Week 3: GDPR & AWS Security
- Day 1-2: GDPR compliance features
- Day 3-4: AWS security hardening
- Day 5: Security audit

### Week 4: Testing & Documentation
- Day 1-2: Penetration testing
- Day 3-4: Bug fixes
- Day 5: Documentation & deployment

---

## Success Criteria

- ✅ All API endpoints require authentication
- ✅ Rate limiting active for all tiers
- ✅ Data encrypted at rest and in transit
- ✅ GDPR data deletion working
- ✅ AWS security best practices implemented
- ✅ Zero critical security vulnerabilities
- ✅ 95%+ test coverage for security code

---

## Next Steps

1. Review and approve this plan
2. Set up AWS infrastructure (VPC, security groups)
3. Implement JWT and API key services
4. Deploy to staging environment
5. Run security audit
6. Deploy to production
