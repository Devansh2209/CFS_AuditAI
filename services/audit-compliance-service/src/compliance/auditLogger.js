// services/shared/auditLogger.js

/**
 * Audit Logger for GDPR Compliance
 * Tracks all user actions, resource access, and security events
 */
class AuditLogger {
    constructor(db) {
        this.db = db;
    }

    /**
     * Log a user action
     * @param {object} params - Log parameters
     */
    async log(params) {
        const {
            userId,
            action,
            resourceType,
            resourceId,
            ipAddress,
            userAgent,
            details = {},
            status = 'success'
        } = params;

        try {
            // Calculate retention date (7 years for financial data, 1 year for access logs)
            const retentionPeriod = action.includes('FINANCIAL') ? 7 : 1;
            const retentionDate = new Date();
            retentionDate.setFullYear(retentionDate.getFullYear() + retentionPeriod);

            await this.db.query(`
        INSERT INTO audit_logs (
          user_id, action, resource_type, resource_id, 
          ip_address, user_agent, details, status, 
          retention_until, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      `, [
                userId,
                action,
                resourceType,
                resourceId,
                ipAddress,
                userAgent,
                JSON.stringify(details),
                status,
                retentionDate
            ]);

            return true;
        } catch (error) {
            console.error('Failed to write audit log:', error);
            // Don't throw error to prevent blocking main flow, but alert admin
            return false;
        }
    }

    /**
     * Log sensitive data access (Read access)
     */
    async logAccess(userId, resourceType, resourceId, ipAddress) {
        return this.log({
            userId,
            action: 'READ_ACCESS',
            resourceType,
            resourceId,
            ipAddress,
            details: { access_type: 'read' }
        });
    }

    /**
     * Log data modification
     */
    async logModification(userId, resourceType, resourceId, changes, ipAddress) {
        return this.log({
            userId,
            action: 'UPDATE',
            resourceType,
            resourceId,
            ipAddress,
            details: { changes }
        });
    }

    /**
     * Log data deletion
     */
    async logDeletion(userId, resourceType, resourceId, ipAddress) {
        return this.log({
            userId,
            action: 'DELETE',
            resourceType,
            resourceId,
            ipAddress,
            details: { permanent: true }
        });
    }

    /**
     * Log security event (login, password change, etc.)
     */
    async logSecurityEvent(userId, eventType, ipAddress, details = {}) {
        return this.log({
            userId,
            action: `SECURITY_${eventType}`,
            resourceType: 'USER_ACCOUNT',
            resourceId: userId,
            ipAddress,
            details
        });
    }

    /**
     * Search audit logs (for Data Subject Access Requests)
     */
    async searchLogs(userId, filters = {}) {
        const { startDate, endDate, action } = filters;
        let query = 'SELECT * FROM audit_logs WHERE user_id = $1';
        const params = [userId];
        let paramCount = 1;

        if (startDate) {
            paramCount++;
            query += ` AND created_at >= $${paramCount}`;
            params.push(startDate);
        }

        if (endDate) {
            paramCount++;
            query += ` AND created_at <= $${paramCount}`;
            params.push(endDate);
        }

        if (action) {
            paramCount++;
            query += ` AND action = $${paramCount}`;
            params.push(action);
        }

        query += ' ORDER BY created_at DESC LIMIT 1000';

        const result = await this.db.query(query, params);
        return result.rows;
    }
}

module.exports = AuditLogger;
