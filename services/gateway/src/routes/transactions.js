// services/gateway/src/routes/transactions.js
// Transaction management endpoints

const express = require('express');
const router = express.Router();

// In-memory transaction store (replace with database in production)
let transactions = [];
let transactionIdCounter = 1;

/**
 * GET /api/v1/transactions
 * Get all transactions with filtering and pagination
 */
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            status,
            category,
            minConfidence,
            maxConfidence,
            search,
            uploadId,
            startDate,
            endDate,
            sortBy = 'date',
            sortOrder = 'desc'
        } = req.query;

        // Filter transactions
        let filtered = [...transactions];

        if (status) {
            filtered = filtered.filter(t => t.status === status);
        }

        if (category) {
            filtered = filtered.filter(t => t.category === category);
        }

        if (minConfidence) {
            filtered = filtered.filter(t => t.confidence >= parseFloat(minConfidence));
        }

        if (maxConfidence) {
            filtered = filtered.filter(t => t.confidence <= parseFloat(maxConfidence));
        }

        if (uploadId) {
            filtered = filtered.filter(t => t.uploadId === uploadId);
        }

        if (startDate) {
            filtered = filtered.filter(t => new Date(t.date) >= new Date(startDate));
        }

        if (endDate) {
            filtered = filtered.filter(t => new Date(t.date) <= new Date(endDate));
        }

        if (search) {
            const searchTerms = search.toLowerCase().split(/\s+/).filter(term => term.length > 0);

            filtered = filtered.filter(t => {
                const description = t.description.toLowerCase();
                const merchant = (t.merchant || '').toLowerCase();
                const category = (t.category || '').toLowerCase();

                // Check if ALL search terms are present in either description, merchant, or category
                return searchTerms.every(term =>
                    description.includes(term) ||
                    merchant.includes(term) ||
                    category.includes(term)
                );
            });
        }

        // Sort transactions
        filtered.sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];

            if (sortBy === 'date') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }

            if (sortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

        // Paginate
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + parseInt(pageSize);
        const paginated = filtered.slice(startIndex, endIndex);

        res.json({
            transactions: paginated,
            pagination: {
                page: parseInt(page),
                pageSize: parseInt(pageSize),
                total: filtered.length,
                totalPages: Math.ceil(filtered.length / pageSize)
            }
        });

    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve transactions'
        });
    }
});

/**
 * GET /api/v1/transactions/:id
 * Get a single transaction by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const transaction = transactions.find(t => t.id === parseInt(id));

        if (!transaction) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Transaction not found'
            });
        }

        res.json(transaction);

    } catch (error) {
        console.error('Get transaction error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve transaction'
        });
    }
});

/**
 * POST /api/v1/transactions
 * Create a new transaction (called by frontend after classification)
 */
router.post('/', async (req, res) => {
    try {
        const transaction = {
            id: transactionIdCounter++,
            ...req.body,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        transactions.push(transaction);

        res.status(201).json(transaction);

    } catch (error) {
        console.error('Create transaction error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to create transaction'
        });
    }
});

/**
 * PATCH /api/v1/transactions/:id
 * Update a transaction (e.g., change classification)
 */
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const index = transactions.findIndex(t => t.id === parseInt(id));

        if (index === -1) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Transaction not found'
            });
        }

        transactions[index] = {
            ...transactions[index],
            ...req.body,
            updatedAt: new Date().toISOString()
        };

        res.json(transactions[index]);

    } catch (error) {
        console.error('Update transaction error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to update transaction'
        });
    }
});

/**
 * DELETE /api/v1/transactions/:id
 * Delete a transaction
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const index = transactions.findIndex(t => t.id === parseInt(id));

        if (index === -1) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Transaction not found'
            });
        }

        transactions.splice(index, 1);

        res.status(204).send();

    } catch (error) {
        console.error('Delete transaction error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to delete transaction'
        });
    }
});

/**
 * POST /api/v1/transactions/bulk-approve
 * Approve multiple transactions
 */
router.post('/bulk-approve', async (req, res) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'ids must be an array'
            });
        }

        const updated = [];
        ids.forEach(id => {
            const index = transactions.findIndex(t => t.id === parseInt(id));
            if (index !== -1) {
                transactions[index].status = 'approved';
                transactions[index].updatedAt = new Date().toISOString();
                updated.push(transactions[index]);
            }
        });

        res.json({
            updated: updated.length,
            transactions: updated
        });

    } catch (error) {
        console.error('Bulk approve error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to approve transactions'
        });
    }
});

/**
 * POST /api/v1/transactions/bulk-flag
 * Flag multiple transactions for review
 */
router.post('/bulk-flag', async (req, res) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'ids must be an array'
            });
        }

        const updated = [];
        ids.forEach(id => {
            const index = transactions.findIndex(t => t.id === parseInt(id));
            if (index !== -1) {
                transactions[index].status = 'flagged';
                transactions[index].updatedAt = new Date().toISOString();
                updated.push(transactions[index]);
            }
        });

        res.json({
            updated: updated.length,
            transactions: updated
        });

    } catch (error) {
        console.error('Bulk flag error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to flag transactions'
        });
    }
});

// Export both the router and the transactions array (for other routes to access)
module.exports = { router, transactions, getNextId: () => transactionIdCounter++ };
