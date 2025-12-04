const express = require('express');
const app = express();
const PORT = process.env.PORT || 8011;

app.use(express.json());

app.get('/', (req, res) => {
    res.json({
        service: 'client-configuration-service',
        status: 'active',
        version: '1.0.0'
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'UP', service: 'client-configuration-service' });
});

app.listen(PORT, () => {
    console.log(`Client Configuration Service running on port ${PORT}`);
});
