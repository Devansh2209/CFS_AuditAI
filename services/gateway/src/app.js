// src/app.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

// Middleware
const { rateLimitMiddleware, burstProtectionMiddleware } = require('./middleware/rateLimiter');
const { ddosProtectionMiddleware } = require('./middleware/ddosProtection');
const { inputValidationMiddleware, cspMiddleware } = require('./middleware/inputValidation');
const authMiddleware = require('./middleware/auth');

// Services (Initialize)
// In a real app, we would inject DB connections here
const app = express();

// ==========================================
// SECURITY MIDDLEWARE LAYER
// ==========================================

// 1. Basic Security Headers
app.use(helmet());
app.use(cspMiddleware);

// 2. CORS
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// 3. DDoS & Rate Limiting
app.use(ddosProtectionMiddleware);
app.use(rateLimitMiddleware);
app.use(burstProtectionMiddleware);

// 4. Body Parsing & Input Validation
app.use(express.json({ limit: '10kb' })); // Limit body size
app.use(inputValidationMiddleware);

// ==========================================
// ROUTES
// ==========================================

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Example Protected Route
app.post('/api/v1/classify', authMiddleware, (req, res) => {
    // This would call the Rule Engine Service
    res.json({
        message: 'Transaction received for classification',
        transaction_id: req.body.id,
        status: 'processing'
    });
});

// ==========================================
// ERROR HANDLING
// ==========================================

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
    });
});

module.exports = app;
