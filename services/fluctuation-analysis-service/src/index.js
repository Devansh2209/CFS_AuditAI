const express = require('express');
const app = express();
const PORT = process.env.PORT || 8004;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    service: 'fluctuation-analysis-service',
    status: 'active',
    version: '1.0.0'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'fluctuation-analysis-service' });
});

app.listen(PORT, () => {
  console.log(`Fluctuation Analysis Service running on port ${PORT}`);
});
