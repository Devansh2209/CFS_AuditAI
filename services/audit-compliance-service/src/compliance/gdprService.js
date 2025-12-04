// services/shared/gdprService.js

/**
 * GDPR Service
 * Handles Data Deletion Requests (Right to be Forgotten)
 * and Data Export Requests (Right to Data Portability)
 */
class GDPRService {
    constructor(db, auditLogger) {
        this.db = db;
        this.auditLogger = auditLogger;
        this.deletionGracePeriodDays = 30;
    }

    /**
     * Request data deletion (Right to be Forgotten)
     * Schedules deletion after grace period
     */
    async requestDeletion(userId, reason = 'user_request') {
        const scheduledDate = new Date();
        scheduledDate.setDate(scheduledDate.getDate() + this.deletionGracePeriodDays);

        // Check if request already exists
        const existing = await this.db.query(
            'SELECT * FROM deletion_requests WHERE user_id = $1 AND status = \'pending\'',
            [userId]
        );

        if (existing.rows.length > 0) {
            return {
                status: 'already_requested',
                scheduled_date: existing.rows[0].scheduled_for,
                message: 'Deletion already scheduled'
            };
        }

        // Create deletion request
        await this.db.query(`
      INSERT INTO deletion_requests (
        user_id, reason, scheduled_for, status, created_at
      ) VALUES ($1, $2, $3, 'pending', NOW())
    `, [userId, reason, scheduledDate]);

        // Log the request
        await this.auditLogger.log({
            userId,
            action: 'GDPR_DELETION_REQUEST',
            resourceType: 'USER_DATA',
            resourceId: userId,
            details: { reason, scheduled_date: scheduledDate }
        });

        return {
            status: 'scheduled',
            scheduled_date: scheduledDate,
            grace_period_days: this.deletionGracePeriodDays,
            message: `Account deletion scheduled for ${scheduledDate.toISOString()}. You can cancel this request within ${this.deletionGracePeriodDays} days.`
        };
    }

    /**
     * Cancel deletion request
     */
    async cancelDeletion(userId) {
        const result = await this.db.query(`
      UPDATE deletion_requests 
      SET status = 'cancelled', cancelled_at = NOW()
      WHERE user_id = $1 AND status = 'pending'
      RETURNING id
    `, [userId]);

        if (result.rows.length === 0) {
            throw new Error('No pending deletion request found');
        }

        await this.auditLogger.log({
            userId,
            action: 'GDPR_DELETION_CANCEL',
            resourceType: 'USER_DATA',
            resourceId: userId
        });

        return { success: true, message: 'Deletion request cancelled' };
    }

    /**
     * Execute scheduled deletions (Cron job)
     * Permanently deletes data for eligible requests
     */
    async processScheduledDeletions() {
        const client = await this.db.connect(); // Use transaction

        try {
            await client.query('BEGIN');

            // Find eligible requests
            const requests = await client.query(`
        SELECT * FROM deletion_requests 
        WHERE status = 'pending' AND scheduled_for <= NOW()
        FOR UPDATE SKIP LOCKED
      `);

            const deletedUsers = [];

            for (const req of requests.rows) {
                const userId = req.user_id;

                // 1. Anonymize user record (keep ID for audit logs integrity, but remove PII)
                await client.query(`
          UPDATE users 
          SET email = 'deleted_' || id || '@deleted.cashflowai.com',
              password_hash = 'deleted',
              active = false,
              deleted_at = NOW()
          WHERE id = $1
        `, [userId]);

                // 2. Delete sensitive data
                await client.query('DELETE FROM api_keys WHERE user_id = $1', [userId]);
                await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
                await client.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);

                // 3. Delete business data (or anonymize based on retention policy)
                // For this implementation, we delete custom rules but keep transaction logs (anonymized)
                await client.query('DELETE FROM custom_rules WHERE client_id = $1', [userId]);

                // 4. Mark request as completed
                await client.query(`
          UPDATE deletion_requests 
          SET status = 'completed', completed_at = NOW()
          WHERE id = $1
        `, [req.id]);

                deletedUsers.push(userId);
            }

            await client.query('COMMIT');

            return {
                processed: requests.rows.length,
                deleted_user_ids: deletedUsers
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Export user data (Right to Data Portability)
     */
    async exportUserData(userId) {
        // Gather all user data
        const user = await this.db.query('SELECT id, email, role, created_at FROM users WHERE id = $1', [userId]);
        const apiKeys = await this.db.query('SELECT key_id, name, created_at FROM api_keys WHERE user_id = $1', [userId]);
        const rules = await this.db.query('SELECT name, description, category FROM custom_rules WHERE client_id = $1', [userId]);
        const auditLogs = await this.db.query('SELECT action, created_at, ip_address FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100', [userId]);

        await this.auditLogger.log({
            userId,
            action: 'GDPR_DATA_EXPORT',
            resourceType: 'USER_DATA',
            resourceId: userId
        });

        return {
            user_profile: user.rows[0],
            api_keys: apiKeys.rows,
            custom_rules: rules.rows,
            recent_activity: auditLogs.rows,
            export_date: new Date().toISOString(),
            note: 'This export contains your personal data as per GDPR Article 20.'
        };
    }
}

module.exports = GDPRService;
