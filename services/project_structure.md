# CFS AuditAI Platform - Project Structure

This document outlines the physical structure of the codebase and the purpose of each directory and file.

## Root Directory: `services/`

The root directory contains all the microservices, shared libraries, and orchestration configurations.

### 1. Orchestration & Configuration
*   **`docker-compose.yml`**: The master orchestration file. It defines all 11 microservices, the API gateway, the frontend, and 11 mock PostgreSQL databases. It handles networking (`cfs-network`), volume mounting, and environment variables.
*   **`README.md`**: Quick start guide with instructions for building and running the platform.
*   **`system_overview.md`**: Detailed documentation of the system's logic, algorithms, and accounting standards.

### 2. Frontend & Gateway
*   **`frontend/`**: The React-based Graphical User Interface (GUI).
    *   `src/Dashboard.jsx`: The main dashboard component displaying real-time service status.
    *   `vite.config.js`: Configuration for the Vite build tool, including security allow-lists.
    *   `Dockerfile`: Builds the Nginx-based frontend container.
*   **`gateway/`**: The API Gateway entry point.
    *   `nginx.conf`: Nginx configuration file. It acts as a reverse proxy, routing traffic from port 80 to the appropriate microservice or the frontend based on the URL path.

### 3. Microservices
Each service follows a standard structure:
*   `src/index.js`: The main entry point containing the service's business logic and API endpoints.
*   `Dockerfile`: Instructions to containerize the service (Node.js Alpine base).
*   `package.json`: Dependencies and scripts.

#### Core Business Logic
*   **`accounting-standards-service/`**: Implements GAAP/IFRS rules (e.g., ASC 606, ASC 842).
*   **`business-logic-service/`**: The central brain. Contains industry profiles, client-specific rules, and the context-aware classification engine.

#### Data Processing
*   **`data-ingestion-service/`**: Handles the intake of raw financial transaction data.
*   **`fluctuation-analysis-service/`**: Analyzes variance in account balances (e.g., MoM, YoY) to detect anomalies.

#### AI & ML
*   **`classification-ai-service/`**: Uses ML models to predict account classifications.
*   **`nlp-processing-service/`**: Processes text descriptions from transactions to extract semantic meaning.

#### Workflow & Compliance
*   **`workflow-orchestration-service/`**: Manages complex task dependencies and process flows.
*   **`reclassification-service/`**: Manages the proposal and approval process for changing account classifications. Includes the "Four-Eyes Principle" logic.
*   **`audit-compliance-service/`**: Logs all critical actions for audit trails and compliance reporting.

#### Security & Config
*   **`security-auth-service/`**: Handles authentication (JWT), authorization (RBAC), and zero-trust security enforcement.
*   **`client-configuration-service/`**: Manages dynamic configuration settings for different clients.

### 4. Shared Libraries (`shared/`)
Reusable code shared across multiple microservices to ensure consistency and reduce duplication.
*   **`shared/accounting-types/`**: TypeScript/JSDoc definitions for standard accounting objects (e.g., `Transaction`, `Account`).
*   **`shared/api-schemas/`**: JSON Schemas or validation rules for API requests and responses.
*   **`shared/common-utils/`**: Utility functions for logging, error handling, and formatting.

### 5. Databases (Infrastructure)
*   The `docker-compose.yml` defines a dedicated PostgreSQL container for **each** microservice (e.g., `accounting_standards_db`, `security_db`). This enforces the "Database per Service" pattern, ensuring loose coupling.
