// services/gateway/src/routes/stats.js
// Dashboard statistics and analytics endpoints

const express = require('express');
const router = express.Router();

/**
 * GET /api/v1/stats
 * Get dashboard statistics
 */
router.get('/', async (req, res) => {
    try {
        // Import transactions from the transactions route
        const { transactions } = require('./transactions');

        // Calculate statistics
        const stats = {
            overview: {
                total: transactions.length,
                classified: transactions.filter(t => t.status === 'classified' || t.status === 'approved').length,
                pending: transactions.filter(t => t.status === 'pending').length,
                flagged: transactions.filter(t => t.status === 'flagged').length,
            },

            categories: {
                operating: transactions.filter(t => t.category === 'Operating').length,
                investing: transactions.filter(t => t.category === 'Investing').length,
                financing: transactions.filter(t => t.category === 'Financing').length,
            },

            confidence: {
                high: transactions.filter(t => t.confidence >= 0.8).length,
                medium: transactions.filter(t => t.confidence >= 0.5 && t.confidence < 0.8).length,
                low: transactions.filter(t => t.confidence < 0.5).length,
                average: transactions.length > 0
                    ? transactions.reduce((sum, t) => sum + (t.confidence || 0), 0) / transactions.length
                    : 0
            },

            amounts: {
                total: transactions.reduce((sum, t) => sum + (t.amount || 0), 0),
                operating: transactions
                    .filter(t => t.category === 'Operating')
                    .reduce((sum, t) => sum + (t.amount || 0), 0),
                investing: transactions
                    .filter(t => t.category === 'Investing')
                    .reduce((sum, t) => sum + (t.amount || 0), 0),
                financing: transactions
                    .filter(t => t.category === 'Financing')
                    .reduce((sum, t) => sum + (t.amount || 0), 0),
            },

            sources: {
                ai: transactions.filter(t => t.source === 'ai' || t.source === 'ai_only').length,
                rules: transactions.filter(t => t.source === 'business_rule').length,
                manual: transactions.filter(t => t.source === 'manual').length,
                aiAndRule: transactions.filter(t => t.source === 'ai_and_rule').length,
            },

            recentActivity: transactions
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 10)
                .map(t => ({
                    id: t.id,
                    description: t.description,
                    amount: t.amount,
                    category: t.category,
                    confidence: t.confidence,
                    date: t.date
                }))
        };

        res.json(stats);

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve statistics'
        });
    }
});

/**
 * GET /api/v1/stats/trends
 * Get trend data for charts
 */
router.get('/trends', async (req, res) => {
    try {
        const { transactions } = require('./transactions');
        const { period = '7d' } = req.query;

        // Group transactions by date
        const dateGroups = {};
        transactions.forEach(t => {
            const date = t.date || new Date(t.createdAt).toISOString().split('T')[0];
            if (!dateGroups[date]) {
                dateGroups[date] = {
                    date,
                    operating: 0,
                    investing: 0,
                    financing: 0,
                    count: 0
                };
            }
            dateGroups[date][t.category.toLowerCase()] += t.amount || 0;
            dateGroups[date].count++;
        });

        // Convert to array and sort by date
        const trends = Object.values(dateGroups).sort((a, b) =>
            new Date(a.date) - new Date(b.date)
        );

        res.json({
            period,
            data: trends
        });

    } catch (error) {
        console.error('Get trends error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve trends'
        });
    }
});

/**
 * GET /api/v1/stats/category-breakdown
 * Get detailed category breakdown
 */
router.get('/category-breakdown', async (req, res) => {
    try {
        const { transactions } = require('./transactions');

        // Group by category and subcategory
        const breakdown = {};

        transactions.forEach(t => {
            const category = t.category || 'Uncategorized';
            const subcategory = t.subcategory || 'Other';

            if (!breakdown[category]) {
                breakdown[category] = {
                    total: 0,
                    count: 0,
                    subcategories: {}
                };
            }

            breakdown[category].total += t.amount || 0;
            breakdown[category].count++;

            if (!breakdown[category].subcategories[subcategory]) {
                breakdown[category].subcategories[subcategory] = {
                    total: 0,
                    count: 0
                };
            }

            breakdown[category].subcategories[subcategory].total += t.amount || 0;
            breakdown[category].subcategories[subcategory].count++;
        });

        res.json(breakdown);

    } catch (error) {
        console.error('Get category breakdown error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve category breakdown'
        });
    }
});

module.exports = router;
