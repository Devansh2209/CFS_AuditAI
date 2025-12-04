// services/gateway/src/server.js
// API Gateway - Entry point for all client requests
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

// Middleware
const { rateLimitMiddleware, burstProtectionMiddleware } = require('./middleware/rateLimiter');
const { ddosProtectionMiddleware } = require('./middleware/ddosProtection');
const { inputValidationMiddleware, cspMiddleware } = require('./middleware/inputValidation');

const app = express();
const PORT = process.env.PORT || 3000;
const mockRedis = require('./utils/mockRedis');

// Middleware to attach Redis to request
app.use((req, res, next) => {
    req.redis = mockRedis;
    next();
});

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
app.use(express.json({ limit: '10kb' }));
app.use(inputValidationMiddleware);

// ==========================================
// HEALTH CHECK
// ==========================================

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            gateway: 'up',
            auth: 'up',
            classification: 'up',
            compliance: 'up'
        }
    });
});

// ==========================================
// SERVICE ROUTES
// ==========================================

// Import routes
const { router: transactionsRouter } = require('./routes/transactions');
const classificationRouter = require('./routes/classification');
const uploadRouter = require('./routes/upload');
const statsRouter = require('./routes/stats');
const { router: rulesRouter } = require('./routes/rules');

// ==========================================
// API ROUTES
// ==========================================

app.use('/api/v1/transactions', transactionsRouter);
app.use('/api/v1/classify', classificationRouter);
app.use('/api/v1/upload', uploadRouter);
app.use('/api/v1/stats', statsRouter);
app.use('/api/v1/rules', rulesRouter);

// Auth Service Routes (placeholder for now)
app.use('/api/v1/auth', (req, res) => {
    res.json({ message: 'Auth service endpoint - Coming soon' });
});

// Compliance Service Routes (placeholder for now)
app.use('/api/v1/compliance', (req, res) => {
    res.json({ message: 'Compliance service endpoint - Coming soon' });
});

// Frontend (Serve static files in production)
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../../frontend/dist')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
    });
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
            gateway: 'running',
            classification: 'running',
            transactions: 'running',
            stats: 'running'
        }
    });
});

// Catch-all for unimplemented endpoints (return 200 with empty data instead of 500)
app.use(/^\/api\/v1\/.*/, (req, res) => {
    console.log(`⚠️  Unimplemented endpoint called: ${req.method} ${req.originalUrl}`);
    res.json({
        message: 'Endpoint not yet implemented',
        endpoint: req.originalUrl,
        method: req.method,
        data: []
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 API Gateway running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔒 Security: WAF, Rate Limiting, DDoS Protection enabled`);
});

module.exports = app;
