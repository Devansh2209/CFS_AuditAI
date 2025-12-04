# CFS AuditAI Platform

## Prerequisites
- Docker & Docker Compose
- Node.js (for local development)

## Running the Platform

To start all services, use Docker Compose:

```bash
docker-compose up --build
```

This will spin up:
- API Gateway (Port 80)
- All Microservices (Ports 8001-8011)
- Associated Databases

## Service Ports

| Service | Port |
|---------|------|
| API Gateway | 80 |
| Accounting Standards | 8001 |
| Business Logic | 8002 |
| Data Ingestion | 8003 |
| Fluctuation Analysis | 8004 |
| Classification AI | 8005 |
| NLP Processing | 8006 |
| Reclassification | 8007 |
| Workflow Orchestration | 8008 |
| Audit Compliance | 8009 |
| Security Auth | 8010 |
| Client Configuration | 8011 |

## Development

Each service is located in the `services/` directory. You can run them individually for development:

```bash
cd services/<service-name>
npm install
npm start
```
