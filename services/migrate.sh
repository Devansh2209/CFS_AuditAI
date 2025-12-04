#!/bin/bash
set -e

echo "Waiting for databases to be ready..."
sleep 5

echo "Applying migrations for Data Ingestion Service..."
cat data-ingestion-service/src/migrations/001_initial_schema.sql | docker exec -i services-ingestion_queue_db-1 psql -U postgres

echo "Applying migrations for Workflow Orchestration Service..."
cat workflow-orchestration-service/src/migrations/001_initial_schema.sql | docker exec -i services-workflow_state_db-1 psql -U postgres

echo "Applying migrations for Security Auth Service..."
cat security-auth-service/src/migrations/001_initial_schema.sql | docker exec -i services-security_db-1 psql -U postgres

echo "✅ All migrations applied successfully!"
