const express = require('express');
const router = express.Router();

// Import services
const RuleEngine = require('../../../classification-ai-service/src/engine/ruleEngine');
const AIServiceIntegration = require('../../../classification-ai-service/src/engine/aiIntegration');
const ComplexTransactionParser = require('../../../classification-ai-service/src/engine/complexTransactionParser');

// Import comprehensive rules
const comprehensiveRules = require('../data/comprehensiveRules');

// Import transaction store
const { transactions, getNextId } = require('./transactions');

// Mock DB and Cache
class MockDB {
    constructor() {
        this.industryRules = comprehensiveRules.map(rule => ({
            id: rule.id,
            rule_name: rule.name,
            pattern: rule.pattern,
            pattern_flags: 'i',
            target_category: rule.category,
            subcategory: rule.subcategory,
            priority: rule.priority,
            confidence_boost: rule.confidence,
            reasoning: `${rule.name} - GAAP Classification: ${rule.category}`
        }));
    }

    async query(sql, params) {
        if (sql.includes('classification_rules')) {
            return { rows: this.industryRules };
        }
        return { rows: [] };
    }
}

class MockCache {
    constructor() { this.store = {}; }
    async get(key) { return this.store[key] || null; }
    async setEx(key, ttl, value) { this.store[key] = value; }
    async del(key) { delete this.store[key]; }
}

// Initialize services
const db = new MockDB();
const cache = new MockCache();
const ruleEngine = new RuleEngine(db, cache);
const aiService = new AIServiceIntegration(db, cache);
const complexParser = new ComplexTransactionParser();

/**
 * POST /api/v1/classify
 * Classify a single transaction (simple or complex)
 */
router.post('/', async (req, res) => {
    try {
        console.log('Classification request received:', req.body);

        // Parse transaction (handles both simple and complex formats)
        const parsedTransaction = complexParser.parseTransaction(req.body);

        // Check if this is a complex transaction
        const isComplex = parsedTransaction.metadata?.complex;

        let result;

        if (isComplex) {
            // For complex transactions, use GAAP category determination
            const gaapResult = complexParser.determineGAAPCategory(parsedTransaction);

            result = {
                category: gaapResult.category,
                subcategory: gaapResult.subcategory,
                confidence: 0.95, // High confidence for rule-based complex classification
                source: 'complex_parser',
                rule_applied: 'Complex Transaction Analysis',
                reasoning: gaapResult.reasoning,
                metadata: parsedTransaction.metadata
            };
        } else {
            // For simple transactions, use comprehensive rules directly
            const description = parsedTransaction.description.toLowerCase();
            let matchedRule = null;

            // Search through comprehensive rules for a match
            for (const rule of comprehensiveRules) {
                const pattern = new RegExp(rule.pattern, 'i');
                if (pattern.test(description)) {
                    matchedRule = rule;
                    break;
                }
            }

            if (matchedRule) {
                result = {
                    category: matchedRule.category,
                    subcategory: matchedRule.subcategory || 'Other',
                    confidence: matchedRule.confidence || 0.85,
                    source: 'rule_based',
                    rule_applied: matchedRule.name,
                    reasoning: `Matched rule: ${matchedRule.name}`
                };
            } else {
                // Default classification if no rule matches
                result = {
                    category: 'Operating',
                    subcategory: 'Other',
                    confidence: 0.5,
                    source: 'default',
                    rule_applied: 'Default Classification',
                    reasoning: 'No matching rules found, using default category'
                };
            }
        }

        // Save transaction to store
        const savedTransaction = {
            id: getNextId(),
            uploadId: null, // Single transactions don't have uploadId
            date: parsedTransaction.date,
            amount: parsedTransaction.amount,
            description: parsedTransaction.description,
            category: result.category,
            subcategory: result.subcategory || 'Other',
            confidence: result.confidence,
            status: result.confidence > 0.8 ? 'classified' : 'pending',
            source: result.source,
            rule_applied: result.rule_applied,
            merchant: extractMerchant(parsedTransaction.description),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        transactions.push(savedTransaction);

        console.log('Transaction classified successfully:', savedTransaction.id, result.category);

        res.json({
            transaction_id: savedTransaction.id,
            status: 'classified',
            category: result.category,
            subcategory: result.subcategory,
            confidence: result.confidence,
            source: result.source,
            rule_applied: result.rule_applied,
            merchant: savedTransaction.merchant,
            compliance: {
                flagged: result.confidence < 0.7,
                notes: result.confidence < 0.7 ? 'Low confidence - requires review' : 'GAAP compliant'
            }
        });

    } catch (error) {
        console.error('Classification error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to classify transaction',
            details: error.message
        });
    }
});

/**
 * POST /api/v1/classify/batch
 * Classify multiple transactions
 */
router.post('/batch', async (req, res) => {
    try {
        const { transactions } = req.body;

        if (!Array.isArray(transactions) || transactions.length === 0) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Transactions array is required'
            });
        }

        const results = await Promise.all(
            transactions.map(async (txn) => {
                try {
                    const result = await aiService.enhanceClassification(
                        txn,
                        'software',
                        null
                    );

                    return {
                        transaction_id: txn.id || `txn_${Date.now()}_${Math.random()}`,
                        status: 'classified',
                        category: result.category,
                        confidence: result.confidence,
                        source: result.source
                    };
                } catch (err) {
                    return {
                        transaction_id: txn.id,
                        status: 'error',
                        error: err.message
                    };
                }
            })
        );

        res.json({
            total: transactions.length,
            classified: results.filter(r => r.status === 'classified').length,
            results
        });

    } catch (error) {
        console.error('Batch classification error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to classify transactions'
        });
    }
});

// Helper function to extract merchant from description
function extractMerchant(description) {
    const merchants = {
        'AWS': 'Amazon Web Services',
        'Azure': 'Microsoft Azure',
        'Slack': 'Slack Technologies',
        'Adobe': 'Adobe Inc.',
        'Gusto': 'Gusto',
        'Uber': 'Uber',
        'Delta': 'Delta Air Lines',
        'WeWork': 'WeWork'
    };

    for (const [key, value] of Object.entries(merchants)) {
        if (description.toLowerCase().includes(key.toLowerCase())) {
            return value;
        }
    }

    return 'Unknown';
}

module.exports = router;
