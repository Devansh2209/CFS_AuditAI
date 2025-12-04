// services/security-auth-service/src/apiKeys.js
const crypto = require('crypto');
const bcrypt = require('bcrypt');

/**
 * API Key Service for managing API keys
 * Supports key generation, validation, and revocation
 */
class APIKeyService {
    constructor(db) {
        this.db = db;
        this.saltRounds = 10;
    }

    /**
     * Generate new API key
     * Format: sk_live_{keyId}_{secret}
     */
    async generateAPIKey(userId, name, scopes = [], rateLimitTier = 'free') {
        const keyId = crypto.randomBytes(16).toString('hex');
        const secret = crypto.randomBytes(32).toString('hex');
        const apiKey = `sk_live_${keyId}_${secret}`;

        // Hash the full API key for storage
        const keyHash = await bcrypt.hash(apiKey, this.saltRounds);

        // Rate limits by tier
        const rateLimits = {
            free: 100,
            pro: 1000,
            enterprise: 10000
        };

        const result = await this.db.query(`
      INSERT INTO api_keys (
        key_id, key_hash, user_id, name, scopes, rate_limit
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, key_id, name, scopes, rate_limit, created_at
    `, [
            keyId,
            keyHash,
            userId,
            name,
            JSON.stringify(scopes),
            rateLimits[rateLimitTier] || rateLimits.free
        ]);

        return {
            api_key: apiKey,  // Only shown once!
            key_id: keyId,
            ...result.rows[0],
            warning: 'Store this API key securely. It will not be shown again.'
        };
    }

    /**
     * Validate API key
     */
    async validateAPIKey(apiKey) {
        // Extract key ID from API key
        const parts = apiKey.split('_');
        if (parts.length !== 4 || parts[0] !== 'sk' || parts[1] !== 'live') {
            throw new Error('Invalid API key format');
        }

        const keyId = parts[2];

        // Fetch key from database
        const result = await this.db.query(`
      SELECT * FROM api_keys 
      WHERE key_id = $1 AND revoked_at IS NULL
    `, [keyId]);

        if (result.rows.length === 0) {
            throw new Error('Invalid or revoked API key');
        }

        const key = result.rows[0];

        // Check expiration
        if (key.expires_at && new Date(key.expires_at) < new Date()) {
            throw new Error('API key has expired');
        }

        // Verify hash
        const isValid = await bcrypt.compare(apiKey, key.key_hash);
        if (!isValid) {
            throw new Error('Invalid API key');
        }

        // Update last used timestamp
        await this.db.query(`
      UPDATE api_keys SET last_used_at = NOW() WHERE id = $1
    `, [key.id]);

        return {
            id: key.id,
            user_id: key.user_id,
            scopes: key.scopes,
            rate_limit: key.rate_limit,
            name: key.name
        };
    }

    /**
     * List API keys for a user
     */
    async listAPIKeys(userId) {
        const result = await this.db.query(`
      SELECT 
        id, key_id, name, scopes, rate_limit, 
        last_used_at, expires_at, created_at,
        CASE WHEN revoked_at IS NOT NULL THEN true ELSE false END as revoked
      FROM api_keys
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId]);

        return result.rows.map(key => ({
            ...key,
            key_preview: `sk_live_${key.key_id}_••••••••`
        }));
    }

    /**
     * Revoke API key
     */
    async revokeAPIKey(keyId, userId) {
        const result = await this.db.query(`
      UPDATE api_keys 
      SET revoked_at = NOW()
      WHERE key_id = $1 AND user_id = $2 AND revoked_at IS NULL
      RETURNING id
    `, [keyId, userId]);

        if (result.rows.length === 0) {
            throw new Error('API key not found or already revoked');
        }

        return { success: true, message: 'API key revoked successfully' };
    }

    /**
     * Delete API key (permanent)
     */
    async deleteAPIKey(keyId, userId) {
        const result = await this.db.query(`
      DELETE FROM api_keys
      WHERE key_id = $1 AND user_id = $2
      RETURNING id
    `, [keyId, userId]);

        if (result.rows.length === 0) {
            throw new Error('API key not found');
        }

        return { success: true, message: 'API key deleted successfully' };
    }

    /**
     * Update API key scopes
     */
    async updateScopes(keyId, userId, newScopes) {
        const result = await this.db.query(`
      UPDATE api_keys
      SET scopes = $1
      WHERE key_id = $2 AND user_id = $3 AND revoked_at IS NULL
      RETURNING id, scopes
    `, [JSON.stringify(newScopes), keyId, userId]);

        if (result.rows.length === 0) {
            throw new Error('API key not found or revoked');
        }

        return result.rows[0];
    }

    /**
     * Set expiration date
     */
    async setExpiration(keyId, userId, expiresAt) {
        const result = await this.db.query(`
      UPDATE api_keys
      SET expires_at = $1
      WHERE key_id = $2 AND user_id = $3 AND revoked_at IS NULL
      RETURNING id, expires_at
    `, [expiresAt, keyId, userId]);

        if (result.rows.length === 0) {
            throw new Error('API key not found or revoked');
        }

        return result.rows[0];
    }
}

module.exports = APIKeyService;
