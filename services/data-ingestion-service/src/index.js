const express = require('express');
const cors = require('cors');
const multer = require('multer');
const db = require('./db');
const { processCSV } = require('./file-processors/csvProcessor');

const app = express();
const port = process.env.PORT || 8003;

// Middleware
app.use(cors());
app.use(express.json());

// File Upload Config (Memory Storage)
const upload = multer({ storage: multer.memoryStorage() });

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'data-ingestion-service' });
});

// Transaction Upload Endpoint
app.post('/transactions/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        console.log(`Processing file: ${req.file.originalname}`);
        let transactions = [];

        // Simple file type check
        if (req.file.mimetype === 'text/csv' || req.file.originalname.endsWith('.csv')) {
            transactions = await processCSV(req.file.buffer);
        } else {
            return res.status(400).json({ error: 'Unsupported file type. Only CSV is supported for now.' });
        }

        console.log(`Parsed ${transactions.length} transactions. Inserting into DB...`);

        // Batch Insert
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            const insertQuery = `
                INSERT INTO transactions 
                (date, amount, description, merchant, category, source_system, status)
                VALUES ($1, $2, $3, $4, $5, $6, 'pending')
                RETURNING id;
            `;

            let insertedCount = 0;
            for (const txn of transactions) {
                await client.query(insertQuery, [
                    txn.date,
                    txn.amount,
                    txn.description,
                    txn.merchant,
                    txn.category,
                    txn.source_system
                ]);
                insertedCount++;
            }

            await client.query('COMMIT');
            res.json({
                message: 'File processed successfully',
                count: insertedCount,
                fileName: req.file.originalname
            });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Upload processing error:', error);
        res.status(500).json({ error: 'Failed to process file', details: error.message });
    }
});

// Get Transactions Endpoint (for frontend testing)
app.get('/transactions', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM transactions ORDER BY date DESC LIMIT 100');
        res.json({ transactions: result.rows, total: result.rows.length });
    } catch (error) {
        console.error('Fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

app.listen(port, () => {
    console.log(`Data Ingestion Service listening on port ${port}`);
});
