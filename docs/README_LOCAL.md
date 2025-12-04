# 🚀 How to Run AuditAI Locally

This guide explains how to start the entire AuditAI system (Frontend, Gateway, and FinBERT AI) on your local machine.

## Prerequisites
- **Node.js** (v16+)
- **Python** (v3.9+)
- **Pip** & **NPM**

## Quick Start
We've created a script to automate everything. Just run:

```bash
./run_local.sh
```

This will:
1. Kill any existing processes on ports 3000, 5001, and 5173.
2. Start the **AI Service** (FinBERT V31) on port **5001**.
3. Start the **Gateway** on port **3000**.
4. Start the **Frontend** on port **5173**.

## Accessing the App
Once started, open your browser to:
👉 **http://localhost:5173**

## Stopping the System
To stop all services, run:
```bash
lsof -ti:5001,3000,5173 | xargs kill -9
```

## Logs
If something isn't working, check the log files created in the root directory:
- `ai_service.log`
- `gateway.log`
- `frontend.log`
