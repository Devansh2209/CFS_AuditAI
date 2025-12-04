// services/business-logic-service/src/customRulesAPI.js
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const RuleEngine = require('./ruleEngine');

const router = express.Router();

/**
 * Custom Rules API
 * Allows enterprise customers to create and manage their own classification rules
 */

// ==========================================
// CREATE CUSTOM RULE
// ==========================================

router.post('/custom',
    [
        body('client_id').isInt().withMessage('Client ID must be an integer'),
        body('rule_name').trim().isLength({ min: 1, max: 255 }).withMessage('Rule name is required'),
        body('conditions').isObject().withMessage('Conditions must be an object'),
        body('action').isObject().withMessage('Action must be an object'),
        body('action.category').isIn(['Operating', 'Investing', 'Financing']).withMessage('Invalid category'),
        body('priority').optional().isInt({ min: 0, max: 1000 }).withMessage('Priority must be between 0-1000'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { client_id, rule_name, rule_description, conditions, action, priority } = req.body;

        try {
            const result = await req.db.query(`
        INSERT INTO custom_rules (client_id, rule_name, rule_description, conditions, action, priority)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
                client_id,
                rule_name,
                rule_description || null,
                JSON.stringify(conditions),
                JSON.stringify(action),
                priority || 100
            ]);

            // Invalidate cache for this client
            const ruleEngine = new RuleEngine(req.db, req.cache);
            await ruleEngine.invalidateCache('client', client_id);

            res.status(201).json({
                success: true,
                rule: result.rows[0],
                message: 'Custom rule created successfully'
            });

        } catch (error) {
            if (error.code === '23505') { // Unique constraint violation
                return res.status(409).json({
                    success: false,
                    error: 'A rule with this name already exists for this client'
                });
            }

            console.error('Error creating custom rule:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create custom rule'
            });
        }
    }
);

// ==========================================
// LIST CUSTOM RULES
// ==========================================

router.get('/custom',
    [
        query('client_id').isInt().withMessage('Client ID must be an integer'),
        query('active').optional().isBoolean().withMessage('Active must be boolean'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { client_id, active } = req.query;

        try {
            let query = 'SELECT * FROM custom_rules WHERE client_id = $1';
            const params = [client_id];

            if (active !== undefined) {
                query += ' AND active = $2';
                params.push(active === 'true');
            }

            query += ' ORDER BY priority DESC, created_at DESC';

            const result = await req.db.query(query, params);

            res.json({
                success: true,
                count: result.rows.length,
                rules: result.rows
            });

        } catch (error) {
            console.error('Error listing custom rules:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to list custom rules'
            });
        }
    }
);

// ==========================================
// GET SINGLE CUSTOM RULE
// ==========================================

router.get('/custom/:id',
    [
        param('id').isInt().withMessage('Rule ID must be an integer'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;

        try {
            const result = await req.db.query('SELECT * FROM custom_rules WHERE id = $1', [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Rule not found'
                });
            }

            res.json({
                success: true,
                rule: result.rows[0]
            });

        } catch (error) {
            console.error('Error getting custom rule:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get custom rule'
            });
        }
    }
);

// ==========================================
// UPDATE CUSTOM RULE
// ==========================================

router.put('/custom/:id',
    [
        param('id').isInt().withMessage('Rule ID must be an integer'),
        body('rule_name').optional().trim().isLength({ min: 1, max: 255 }),
        body('conditions').optional().isObject(),
        body('action').optional().isObject(),
        body('priority').optional().isInt({ min: 0, max: 1000 }),
        body('active').optional().isBoolean(),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const updates = req.body;

        try {
            // Build dynamic UPDATE query
            const fields = [];
            const values = [];
            let paramCount = 1;

            Object.keys(updates).forEach(key => {
                if (['rule_name', 'rule_description', 'priority', 'active'].includes(key)) {
                    fields.push(`${key} = $${paramCount}`);
                    values.push(updates[key]);
                    paramCount++;
                } else if (['conditions', 'action'].includes(key)) {
                    fields.push(`${key} = $${paramCount}`);
                    values.push(JSON.stringify(updates[key]));
                    paramCount++;
                }
            });

            if (fields.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No valid fields to update'
                });
            }

            values.push(id);
            const query = `
        UPDATE custom_rules 
        SET ${fields.join(', ')} 
        WHERE id = $${paramCount}
        RETURNING *
      `;

            const result = await req.db.query(query, values);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Rule not found'
                });
            }

            // Invalidate cache
            const ruleEngine = new RuleEngine(req.db, req.cache);
            await ruleEngine.invalidateCache('client', result.rows[0].client_id);

            res.json({
                success: true,
                rule: result.rows[0],
                message: 'Custom rule updated successfully'
            });

        } catch (error) {
            console.error('Error updating custom rule:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update custom rule'
            });
        }
    }
);

// ==========================================
// DELETE CUSTOM RULE
// ==========================================

router.delete('/custom/:id',
    [
        param('id').isInt().withMessage('Rule ID must be an integer'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;

        try {
            const result = await req.db.query('DELETE FROM custom_rules WHERE id = $1 RETURNING client_id', [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Rule not found'
                });
            }

            // Invalidate cache
            const ruleEngine = new RuleEngine(req.db, req.cache);
            await ruleEngine.invalidateCache('client', result.rows[0].client_id);

            res.json({
                success: true,
                message: 'Custom rule deleted successfully'
            });

        } catch (error) {
            console.error('Error deleting custom rule:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete custom rule'
            });
        }
    }
);

// ==========================================
// TEST CUSTOM RULE (Dry Run)
// ==========================================

router.post('/custom/test',
    [
        body('rule').isObject().withMessage('Rule object is required'),
        body('rule.conditions').isObject().withMessage('Rule conditions are required'),
        body('rule.action').isObject().withMessage('Rule action is required'),
        body('test_transactions').isArray().withMessage('Test transactions must be an array'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { rule, test_transactions } = req.body;

        try {
            const ruleEngine = new RuleEngine(req.db, req.cache);
            const results = [];

            for (const transaction of test_transactions) {
                const matched = ruleEngine.evaluateConditions(transaction, rule.conditions);

                results.push({
                    transaction_id: transaction.id || 'unknown',
                    description: transaction.description,
                    matched: matched,
                    would_classify_as: matched ? rule.action.category : null,
                    note: matched ? rule.action.note : null
                });
            }

            const matchCount = results.filter(r => r.matched).length;

            res.json({
                success: true,
                test_results: results,
                summary: {
                    total_tested: test_transactions.length,
                    matched: matchCount,
                    not_matched: test_transactions.length - matchCount,
                    match_rate: `${((matchCount / test_transactions.length) * 100).toFixed(1)}%`
                }
            });

        } catch (error) {
            console.error('Error testing custom rule:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to test custom rule'
            });
        }
    }
);

// ==========================================
// GET RULE EXECUTION ANALYTICS
// ==========================================

router.get('/analytics/executions',
    [
        query('client_id').isInt().withMessage('Client ID must be an integer'),
        query('start_date').optional().isISO8601().withMessage('Invalid start date'),
        query('end_date').optional().isISO8601().withMessage('Invalid end date'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { client_id, start_date, end_date } = req.query;

        try {
            let query = `
        SELECT 
          rule_type,
          rule_name,
          COUNT(*) as execution_count,
          COUNT(CASE WHEN matched THEN 1 END) as match_count,
          AVG(execution_time_ms) as avg_execution_time_ms
        FROM rule_execution_log
        WHERE client_id = $1
      `;
            const params = [client_id];

            if (start_date) {
                params.push(start_date);
                query += ` AND executed_at >= $${params.length}`;
            }

            if (end_date) {
                params.push(end_date);
                query += ` AND executed_at <= $${params.length}`;
            }

            query += ' GROUP BY rule_type, rule_name ORDER BY execution_count DESC';

            const result = await req.db.query(query, params);

            res.json({
                success: true,
                analytics: result.rows
            });

        } catch (error) {
            console.error('Error getting rule analytics:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get rule analytics'
            });
        }
    }
);

module.exports = router;
