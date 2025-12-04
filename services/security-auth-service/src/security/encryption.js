// services/shared/encryption.js
const crypto = require('crypto');

/**
 * Encryption Service using AES-256-GCM
 * Provides authenticated encryption for sensitive data
 */
class EncryptionService {
    constructor(encryptionKey) {
        this.algorithm = 'aes-256-gcm';
        this.key = encryptionKey || process.env.ENCRYPTION_KEY;

        if (!this.key) {
            throw new Error('ENCRYPTION_KEY environment variable is required');
        }

        // Convert hex string to buffer if needed
        if (typeof this.key === 'string') {
            this.key = Buffer.from(this.key, 'hex');
        }

        if (this.key.length !== 32) {
            throw new Error('Encryption key must be 32 bytes (256 bits)');
        }
    }

    /**
     * Encrypt data
     * @param {string|object} data - Data to encrypt
     * @returns {object} Encrypted data with IV and auth tag
     */
    encrypt(data) {
        try {
            // Convert object to JSON string if needed
            const text = typeof data === 'object' ? JSON.stringify(data) : String(data);

            // Generate random IV (12 bytes for GCM)
            const iv = crypto.randomBytes(12);

            // Create cipher
            const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

            // Encrypt data
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');

            // Get authentication tag
            const authTag = cipher.getAuthTag();

            return {
                encrypted,
                iv: iv.toString('hex'),
                authTag: authTag.toString('hex'),
                algorithm: this.algorithm
            };
        } catch (error) {
            throw new Error(`Encryption failed: ${error.message}`);
        }
    }

    /**
     * Decrypt data
     * @param {string} encrypted - Encrypted data
     * @param {string} iv - Initialization vector
     * @param {string} authTag - Authentication tag
     * @returns {string|object} Decrypted data
     */
    decrypt(encrypted, iv, authTag) {
        try {
            // Create decipher
            const decipher = crypto.createDecipheriv(
                this.algorithm,
                this.key,
                Buffer.from(iv, 'hex')
            );

            // Set authentication tag
            decipher.setAuthTag(Buffer.from(authTag, 'hex'));

            // Decrypt data
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            // Try to parse as JSON
            try {
                return JSON.parse(decrypted);
            } catch {
                return decrypted;
            }
        } catch (error) {
            throw new Error(`Decryption failed: ${error.message}`);
        }
    }

    /**
     * Hash sensitive data (one-way)
     * @param {string} data - Data to hash
     * @returns {string} SHA-256 hash
     */
    hash(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Generate random encryption key
     * @returns {string} 32-byte hex key
     */
    static generateKey() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Encrypt field in database object
     * @param {object} obj - Object with field to encrypt
     * @param {string} field - Field name to encrypt
     * @returns {object} Object with encrypted field
     */
    encryptField(obj, field) {
        if (!obj[field]) return obj;

        const encrypted = this.encrypt(obj[field]);
        return {
            ...obj,
            [`${field}_encrypted`]: encrypted.encrypted,
            [`${field}_iv`]: encrypted.iv,
            [`${field}_auth_tag`]: encrypted.authTag
        };
    }

    /**
     * Decrypt field in database object
     * @param {object} obj - Object with encrypted field
     * @param {string} field - Field name to decrypt
     * @returns {object} Object with decrypted field
     */
    decryptField(obj, field) {
        const encryptedField = `${field}_encrypted`;
        const ivField = `${field}_iv`;
        const authTagField = `${field}_auth_tag`;

        if (!obj[encryptedField]) return obj;

        const decrypted = this.decrypt(
            obj[encryptedField],
            obj[ivField],
            obj[authTagField]
        );

        return {
            ...obj,
            [field]: decrypted
        };
    }
}

/**
 * Middleware to encrypt sensitive response fields
 */
function encryptResponseMiddleware(sensitiveFields = []) {
    const encryption = new EncryptionService();

    return (req, res, next) => {
        const originalJson = res.json.bind(res);

        res.json = function (data) {
            if (data && typeof data === 'object') {
                for (const field of sensitiveFields) {
                    if (data[field]) {
                        const encrypted = encryption.encrypt(data[field]);
                        data[`${field}_encrypted`] = encrypted;
                        delete data[field];
                    }
                }
            }
            return originalJson(data);
        };

        next();
    };
}

module.exports = {
    EncryptionService,
    encryptResponseMiddleware
};
