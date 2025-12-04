// services/gateway/src/routes/rules.js
const express = require('express');
const router = express.Router();

// In-memory rules store (replace with database in production)
let customRules = [
    { id: 1, keyword: 'starbucks', category: 'Operating', subcategory: 'Meals & Entertainment', createdAt: new Date().toISOString() },
    { id: 2, keyword: 'aws', category: 'Operating', subcategory: 'Cloud Services', createdAt: new Date().toISOString() },
    { id: 3, keyword: 'uber', category: 'Operating', subcategory: 'Travel', createdAt: new Date().toISOString() }
];
let ruleIdCounter = 4;

/**
 * GET /api/v1/rules
 * Get all custom classification rules
 */
router.get('/', async (req, res) => {
    try {
        res.json({
            total: customRules.length,
            rules: customRules
        });
    } catch (error) {
        console.error('Get rules error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve rules'
        });
    }
});

/**
 * POST /api/v1/rules
 * Create a new custom classification rule
 */
router.post('/', async (req, res) => {
    try {
        const { keyword, category, subcategory } = req.body;

        if (!keyword || !category) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'keyword and category are required'
            });
        }

        const newRule = {
            id: ruleIdCounter++,
            keyword: keyword.toLowerCase(),
            category,
            subcategory: subcategory || 'Other',
            createdAt: new Date().toISOString()
        };

        customRules.push(newRule);

        res.status(201).json(newRule);

    } catch (error) {
        console.error('Create rule error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to create rule'
        });
    }
});

/**
 * DELETE /api/v1/rules/:id
 * Delete a custom classification rule
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const index = customRules.findIndex(r => r.id === parseInt(id));

        if (index === -1) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Rule not found'
            });
        }

        customRules.splice(index, 1);

        res.status(204).send();

    } catch (error) {
        console.error('Delete rule error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to delete rule'
        });
    }
});

// Export both the router and the rules array (for classification to access)
module.exports = { router, customRules };
