# Project Structure Audit & Cleanup Plan

## Current State Analysis
The current project structure is flat and contains a mix of production code, temporary scripts, duplicate tests, and documentation. This is not suitable for a commercial production environment.

### 🚩 Issues Identified
1.  **Flat Structure**: All files are in the root directory.
2.  **Duplicate Tests**: `auth.test.js` (requires deps) vs `auth_logic_test.js` (standalone). `validate_commercial_journey.js` vs `validate_commercial_journey_standalone.js`.
3.  **Temporary Scripts**: Python scripts for training (`train_bert.py`, `sagemaker_train.py`) mixed with Node.js backend code.
4.  **Mixed Concerns**: Database schemas, Terraform files, and application logic are all together.

---

## 🗑️ Files to Remove (Redundant/Temporary)

| File | Reason | Action |
|------|--------|--------|
| `auth.test.js` | Failed due to missing deps; `auth_logic_test.js` covers logic. | **Delete** |
| `validate_commercial_journey.js` | Failed due to missing deps; `_standalone.js` works. | **Delete** |
| `rateLimit.test.js` | Consolidate into `tests/security/` | **Move** |
| `security.test.js` | Failed due to missing deps; `security_standalone.test.js` works. | **Delete** |
| `gdpr.test.js` | Failed initially; keep fixed version but move to tests. | **Move** |
| `*.py` (Training scripts) | Move to `ml_pipeline/` folder. | **Move** |
| `*.json` (Data files) | Move to `data/` folder. | **Move** |
| `*.md` (Plans/Logs) | Move to `docs/` folder. | **Move** |

---

## 🏗️ Proposed Production Structure

```
/cashflow-ai-backend
├── src/
│   ├── config/              # Configuration (env vars, constants)
│   ├── database/            # Database connection & schemas
│   │   ├── schema.sql       # Consolidated schema
│   │   └── index.js         # DB Connection pool
│   ├── middleware/          # Express middleware
│   │   ├── auth.js          # Auth middleware
│   │   ├── rateLimit.js     # Rate limiting
│   │   ├── security.js      # WAF/Input validation
│   │   └── audit.js         # Audit logging
│   ├── services/            # Business logic
│   │   ├── auth/            # Auth service (JWT, API Keys)
│   │   ├── compliance/      # GDPR, Audit
│   │   ├── engine/          # Rule Engine & AI Integration
│   │   └── security/        # Encryption, DDoS
│   ├── utils/               # Helper functions
│   └── app.js               # App entry point
├── tests/                   # Test suite
│   ├── unit/
│   ├── integration/
│   └── scripts/             # Validation scripts
├── infrastructure/          # Terraform & Docker
│   ├── aws/
│   └── docker/
├── ml_pipeline/             # Python ML code
│   ├── training/
│   └── inference/
├── docs/                    # Documentation
└── package.json
```

---

## 📋 Action Plan

1.  **Create Directories**: Set up the new folder structure.
2.  **Consolidate Schemas**: Merge `auth_schema.sql` and `business_logic_schema.sql` into `src/database/schema.sql`.
3.  **Move & Refactor Code**:
    *   Move `jwt.js`, `apiKeys.js` -> `src/services/auth/`
    *   Move `rateLimiter.js`, `ddosProtection.js` -> `src/middleware/`
    *   Move `ruleEngine.js`, `aiIntegration.js` -> `src/services/engine/`
4.  **Cleanup**: Delete identified redundant files.
5.  **Update Imports**: Fix `require()` paths in all moved files.
