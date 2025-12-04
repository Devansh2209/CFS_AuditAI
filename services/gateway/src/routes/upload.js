// services/gateway/src/routes/upload.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { randomUUID } = require('crypto');
const ComplexTransactionParser = require('../../../classification-ai-service/src/engine/complexTransactionParser');
const AIServiceIntegration = require('../../../classification-ai-service/src/engine/aiIntegration');
const RuleEngine = require('../../../classification-ai-service/src/engine/ruleEngine');
const comprehensiveRules = require('../data/comprehensiveRules');
const { transactions, getNextId } = require('./transactions');

// Configure multer for file uploads
const upload = multer({
    dest: '/tmp/uploads/',
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/json', 'text/csv', 'text/plain'];
        if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.json') || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JSON and CSV files are allowed.'));
        }
    }
});

// Initialize services
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

const db = new MockDB();
const cache = new MockCache();
const ruleEngine = new RuleEngine(db, cache);
const aiService = new AIServiceIntegration(db, cache);
const complexParser = new ComplexTransactionParser();

/**
 * POST /api/v1/upload/json
 * Upload and process JSON transaction file
 */
router.post('/json', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'No file uploaded'
            });
        }

        // Read and parse JSON file
        const fileContent = fs.readFileSync(req.file.path, 'utf8');
        let transactionData;

        try {
            transactionData = JSON.parse(fileContent);
        } catch (parseError) {
            fs.unlinkSync(req.file.path); // Clean up
            return res.status(400).json({
                error: 'Invalid JSON',
                message: 'Failed to parse JSON file'
            });
        }

        // Handle both single transaction and array of transactions
        const transactionsToProcess = Array.isArray(transactionData) ? transactionData : [transactionData];

        const results = [];
        const savedTransactions = [];

        // Generate a unique upload ID for this batch
        const uploadId = randomUUID();

        for (const txn of transactionsToProcess) {
            try {
                // Parse transaction
                const parsedTransaction = complexParser.parseTransaction(txn);
                const isComplex = parsedTransaction.metadata?.complex;

                let result;

                if (isComplex) {
                    const gaapResult = complexParser.determineGAAPCategory(parsedTransaction);
                    result = {
                        category: gaapResult.category,
                        subcategory: gaapResult.subcategory,
                        confidence: 0.95,
                        source: 'complex_parser',
                        rule_applied: 'Complex Transaction Analysis',
                        reasoning: gaapResult.reasoning
                    };
                } else {
                    result = await aiService.enhanceClassification(
                        {
                            description: parsedTransaction.description,
                            amount: parsedTransaction.amount,
                            date: parsedTransaction.date
                        },
                        'software',
                        null
                    );
                }

                // Save transaction
                const savedTransaction = {
                    id: getNextId(),
                    uploadId: uploadId, // Link to this upload batch
                    date: parsedTransaction.date,
                    amount: parsedTransaction.amount,
                    description: parsedTransaction.description,
                    category: result.category,
                    subcategory: result.subcategory || 'Other',
                    confidence: result.confidence,
                    status: result.confidence > 0.8 ? 'classified' : 'pending',
                    source: result.source,
                    rule_applied: result.rule_applied,
                    merchant: parsedTransaction.metadata?.merchant || 'Unknown',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                transactions.push(savedTransaction);
                savedTransactions.push(savedTransaction);

                results.push({
                    transaction_id: savedTransaction.id,
                    status: 'classified',
                    category: result.category,
                    subcategory: result.subcategory,
                    confidence: result.confidence,
                    source: result.source
                });

            } catch (error) {
                results.push({
                    transaction_id: txn.transaction_id || 'unknown',
                    status: 'error',
                    error: error.message
                });
            }
        }

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.json({
            total: transactionsToProcess.length,
            classified: results.filter(r => r.status === 'classified').length,
            errors: results.filter(r => r.status === 'error').length,
            results,
            savedTransactions
        });

    } catch (error) {
        console.error('JSON upload error:', error);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to process JSON file'
        });
    }
});

/**
 * POST /api/v1/upload/csv
 * Upload and process CSV transaction file
 */
router.post('/csv', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'No file uploaded'
            });
        }

        const transactionsToProcess = [];
        const results = [];
        const savedTransactions = [];

        // Generate a unique upload ID for this batch
        const uploadId = randomUUID();

        // Parse CSV file
        await new Promise((resolve, reject) => {
            fs.createReadStream(req.file.path)
                .pipe(csv())
                .on('data', (row) => {
                    // Map CSV columns to transaction format
                    // Handle user's specific format with extra fields
                    const description = row.description || row.Description || '';
                    const notes = row.notes || row.Notes || '';

                    // Combine description and notes for better classification context
                    const fullDescription = notes ? `${description} - ${notes}` : description;

                    const txn = {
                        date: row.date || row.Date || new Date().toISOString().split('T')[0],
                        amount: parseFloat(row.amount || row.Amount || 0),
                        description: fullDescription,
                        currency: row.currency || row.Currency || 'USD',
                        merchant: row.merchant || row.Merchant || row.vendor || row.Vendor || 'Unknown',
                        // Capture extra metadata
                        metadata: {
                            transaction_id: row.transaction_id || row.Transaction_ID,
                            bank_account: row.bank_account || row.Bank_Account,
                            payment_method: row.payment_method || row.Payment_Method,
                            original_category: row.category || row.Category, // User's pre-assigned category
                            status: row.status || row.Status
                        }
                    };
                    transactionsToProcess.push(txn);
                })
                .on('end', resolve)
                .on('error', reject);
        });

        // Process each transaction
        for (const txn of transactionsToProcess) {
            try {
                const parsedTransaction = complexParser.parseTransaction(txn);

                const result = await aiService.enhanceClassification(
                    {
                        description: parsedTransaction.description,
                        amount: parsedTransaction.amount,
                        date: parsedTransaction.date
                    },
                    'software',
                    null
                );

                const savedTransaction = {
                    id: getNextId(),
                    uploadId: uploadId, // Link to this upload batch
                    date: parsedTransaction.date,
                    amount: parsedTransaction.amount,
                    description: parsedTransaction.description,
                    category: result.category,
                    subcategory: result.subcategory || 'Other',
                    confidence: result.confidence,
                    status: result.confidence > 0.8 ? 'classified' : 'pending',
                    source: result.source,
                    rule_applied: result.rule_applied,
                    merchant: txn.merchant || 'Unknown',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                transactions.push(savedTransaction);
                savedTransactions.push(savedTransaction);

                results.push({
                    transaction_id: savedTransaction.id,
                    status: 'classified',
                    category: result.category,
                    subcategory: result.subcategory,
                    confidence: result.confidence
                });

            } catch (error) {
                results.push({
                    status: 'error',
                    error: error.message,
                    row: txn
                });
            }
        }

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.json({
            uploadId: uploadId,
            total: transactionsToProcess.length,
            classified: results.filter(r => r.status === 'classified').length,
            errors: results.filter(r => r.status === 'error').length,
            results,
            savedTransactions
        });

    } catch (error) {
        console.error('CSV upload error:', error);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to process CSV file'
        });
    }
});

module.exports = router;
