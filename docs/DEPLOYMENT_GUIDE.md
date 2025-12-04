# Audit AI CFS Platform - Deployment Guide

## System Overview

**AuditAI CFS Platform** is a microservices-based application for automated Cash Flow Statement classification using AI.

### Architecture
- **Gateway Service** (Node.js/Express) - API gateway and orchestration on port 3001
- **Frontend Service** (React/Vite) - User interface on port 3000  
- **Classification AI Service** (Python/Flask) - V29 scikit-learn model on port 5001

### Current Model
- **V29 Scikit-Learn Model** (Dec 2025)
- Format: `.sav` (joblib format)
- Location: `trained_models/finbert_v29_aws/`
- Accuracy: ~99.9% on test cases

---

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+
- **Git**

---

## Quick Start (Local Development)

### 1. Start Classification AI Service

```bash
cd services/classification-ai-service

# Install dependencies
pip install -r requirements.txt

# Start service on port 5001
PORT=5001 python src/bert_service.py
```

**Verify:** `http://localhost:5001/health` should return `{"status": "healthy"}`

### 2. Start Gateway Service

```bash
cd services/gateway

# Install dependencies
npm install

# Start service
npm start
```

**Verify:** `http://localhost:3001/health` should return OK

### 3. Start Frontend

```bash
cd services/frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

**Access:** Open `http://localhost:3000`

---

## Testing the Application

### 1. Health Checks

```bash
# AI Service
curl http://localhost:5001/health

# Gateway
curl http://localhost:3001/health

# Frontend
open http://localhost:3000
```

### 2. Test Transaction Classification

```bash
curl -X POST http://localhost:5001/v1/classify/transactions \
  -H "Content-Type: application/json" \
  -d '{"description": "Paid dividends to shareholders"}'
```

**Expected Response:**
```json
{
  "category": "Financing",
  "confidence": 0.9999,
  "probabilities": {
    "Financing": 0.9999,
    "Investing": 0.00000 6,
    "Operating": 0.000007
  }
}
```

### 3. Use the Frontend

1. Navigate to `http://localhost:3000`
2. Click "Add Transaction"
3. Enter:
   - **Description**: "Purchase of equipment"
   - **Amount**: 5000
4. Click "Classify" or "Add"
5. Verify category shows as "Investing"

---

## Common Issues & Troubleshooting

### Issue: Port 5000 in use (AI Service won't start)
**Solution:** macOS AirPlay uses port 5000. Use port 5001:
```bash
PORT=5001 python src/bert_service.py
```

### Issue: "Model not found" error
**Solution:** Verify V29 model exists:
```bash
ls -l trained_models/finbert_v29_aws/
# Should show: TEST_sclf.sav and TEST_TFIDFs.sav
```

### Issue: Frontend can't connect to backend
**Solution:** Check gateway is running and CORS is enabled:
```bash
ps -ef | grep node | grep gateway
```

### Issue: scikit-learn not found
**Solution:** Install in venv:
```bash
cd services/classification-ai-service
pip install scikit-learn
```

---

## Production Deployment

### Environment Variables

**Gateway (.env)**
```
PORT=3001
NODE_ENV=production
AI_SERVICE_URL=http://localhost:5001
```

**Frontend (.env)**
```
VITE_API_URL=http://localhost:3001
```

**AI Service**
```
PORT=5001
MODEL_PATH=trained_models/finbert_v29_aws/TEST_sclf.sav
```

### Build for Production

```bash
# Frontend
cd services/frontend
npm run build

# Gateway (no build needed, runs Node.js)

# AI Service (use gunicorn for production)
cd services/classification-ai-service
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5001 src.bert_service:app
```

---

## Project Structure

```
audit-ai-cfs/
├── services/
│   ├── frontend/          # React UI (port 3000)
│   ├── gateway/           # Express API gateway (port 3001)
│   └── classification-ai-service/  # Flask AI service (port 5001)
├── trained_models/
│   └── finbert_v29_aws/   # Current V29 model
└── archive/               # Historical files (not needed for deployment)
```

---

## Key API Endpoints

### Gateway (http://localhost:3001)
- `GET /health` - Health check
- `POST /api/transactions` - Add transaction
- `GET /api/transactions` - List transactions
- `POST /api/classify` - Classify transaction

### AI Service (http://localhost:5001)
- `GET /health` - Health check
- `POST /v1/classify/transactions` - Classify single transaction
- `POST /v1/classify/batch` - Classify multiple transactions

---

## Model Information

**Current Model: V29 (scikit-learn)**
- **Format**: joblib `.sav`
- **Classes**: financing, investing, operating (lowercase)
- **Vectorizer**: TF-IDF
- **Training Data**: 1000+ 10-K filings + synthetic data
- **Performance**: 99.9% accuracy on test set

**Location**: `trained_models/finbert_v29_aws/`
- `TEST_sclf.sav` - Classification model  
- `TEST_TFIDFs.sav` - TF-IDF vectorizer

**Integration**: The AI service automatically loads this model on startup.

---

## Support

For issues, check logs:
- AI Service: `services/classification-ai-service/service.log`
- Gateway: Console output
- Frontend: Browser console

---

**Last Updated**: November 2025
**Model Version**: V29
**Platform Version**: 1.0.0
