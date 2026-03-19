# Task: Project Cleanup & Deployment Preparation

## Phase 1: Audit & Planning
- [/] **Inventory Current Structure**
    - [/] List all files and categorize by purpose
    - [ ] Identify redundant/obsolete files
    - [ ] Verify V29 model integration

## Phase 2: Remove Obsolete Files
- [ ] **Training Scripts & Data**
    - [ ] Remove old training scripts (v27, v28 versions)
    - [ ] Remove data extraction/augmentation scripts
    - [ ] Remove seed data and test datasets
    - [ ] Remove old model files (if any)

- [ ] **Documentation & Planning Artifacts**
    - [ ] Archive planning documents
    - [ ] Remove outdated implementation plans
    - [ ] Keep only deployment-relevant docs

- [ ] **Test Files & Utilities**
    - [ ] Remove standalone test scripts
    - [ ] Remove AWS setup scripts (keep only if needed)

## Phase 3: Verify Microservice Architecture
- [ ] **Gateway Service**
    - [ ] Verify routes are clean and organized
    - [ ] Confirm proper error handling
    - [ ] Check environment configuration

- [x] **V30/V31 Balanced Dataset Creation** <!-- id: 4 -->
    - [x] Analyze V28+V29 distribution (Operating: 76%, Investing: 11%, Financing: 13%) <!-- id: 5 -->
    - [x] Create extraction script with stream processing (`extract_v30_balanced.py`) <!-- id: 6 -->
    - [x] Run extraction on AWS EC2 (Complete: 42,135 unique transactions) <!-- id: 7 -->
    - [x] Create V31 balanced dataset (8,641 unique per category, 100% unique) <!-- id: 8 -->
    - [x] Train V31 model (96.47% accuracy, deployed on port 5001) <!-- id: 9 -->

- [x] **Classification AI Service**
    - [x] V31 model loaded and running on port 5001
    - [x] Service tested and functional
    - [x] Verify API endpoints

- [x] **Frontend Service**
    - [x] Update API configuration to point to Gateway (port 3000)
    - [x] Verify Dashboard loading
    - [x] Test end-to-end flow


- [x] **System Verification**
    - [x] All services running locally
    - [x] End-to-end connectivity confirmeds

## Phase 4: Model Council Architecture (Hierarchical Ensemble)
- [x] **Architecture Design**
    - [x] Create detailed plan (`model_council_plan.md`)
    - [x] Define hierarchical splits (Op vs. Non-Op, Inv vs. Fin)
    - [x] Design voting logic (FinBERT + XGBoost/MiniLM)

- [x] **Model Training (XGBoost + MiniLM)**
    - [x] Install dependencies (`sentence-transformers`, `xgboost`)
    - [x] Generate MiniLM embeddings for V31 dataset
    - [x] Train XGBoost: Model A (Operating vs. Non-Operating)
    - [x] Train XGBoost: Model B (Investing vs. Financing)
    - [x] Evaluate performance and save models

- [x] **Service Integration**
    - [x] Update `bert_service.py` to load new models
    - [x] Implement hierarchical prediction logic
    - [x] Implement "Council" voting system
    - [x] Expose via API

## Phase 5: Deployment & Handoff
- [ ] **Project Organization**
    - [x] Clean up root directory
    - [x] Organize scripts and docs
    - [x] Create .gitignore and README.md
    - [x] Push to GitHub (https://github.com/Devansh2209/CFS_AuditAI)

- [ ] **Create Deployment Guide**
    - [ ] Document AWS deployment steps
    - [ ] Create Docker compose for productionedures
    - [ ] Testing checklist

- [ ] **Final Verification**
    - [ ] Test full user workflow
    - [ ] Verify all services communicate
    - [ ] Document any issues

## Phase 6: Strategic Financial Engine (Phase 1: Enrichment)
- [x] **Data Schema Updates**
    - [x] Define `EnrichedTransaction` schema in Gateway
    - [x] Update Transaction Store structure
    - [x] Add enrichment fields (Department, CostType, DriverID)

- [x] **Enrichment Logic Implementation**
    - [x] **Department Tagging**: Map inputs to (Sales, R&D, G&A)
    - [x] **Cost Nature Analysis**: Heuristics for Fixed vs. Variable
    - [x] **Unit Basis Linking**: Associate costs with drivers

- [x] **Anomaly Detection**
    - [x] Implement statistical outlier detection
    - [x] Flag duplicates and "fat finger" errors

- [x] **API & Frontend Updates**
    - [x] Update `GET /transactions` to return enriched data
    - [x] Update Frontend to display new tags

## Phase 7: Strategic Financial Engine (Phase 2: Driver Engine)
- [x] **Driver Schema & Store**
    - [x] Define `BusinessDriver` schema (ID, Name, Logic, Value)
    - [x] Create `DriverStore` to manage KPI definitions

- [x] **KPI Extraction Logic (`DriverEngine`)**
    - [x] **CAC Calculator**: Sum(Marketing + Sales) / New Customers
    - [x] **Burn Multiplier**: Net Burn / Net New ARR
    - [x] **Seasonality Detector**: Extract monthly variance factors

- [x] **API & Frontend Integration**
    - [x] Create `GET /api/v1/drivers` endpoint
    - [x] Build "Business Drivers" dashboard widget

## Phase 8: Strategic Financial Engine (Phase 3: Projection Sandbox)
- [x] **Scenario Engine Backend**
    - [x] Create `services/gateway/src/data/scenarios.js` (Schema & Store)
    - [x] Implement `ProjectionEngine` (Logic to calculate future cash flow based on levers)
    - [x] Create `POST /api/v1/scenarios` to run what-if analysis

- [x] **Frontend Scenario UI**
    - [x] Create `ScenarioHelper` component (Slider UI)
    - [x] Build "Projection Chart" (Visualizing Base vs. Scenario case)
    - [x] Create `ScenarioHelper` component (Slider UI)
    - [x] Build "Projection Chart" (Visualizing Base vs. Scenario case)
    - [x] Integrate real-time API calls on slider change
    - [x] **Custom Variables Support** (User Request)
        - [x] Backend: `POST /api/v1/drivers` to create custom drivers
        - [x] Frontend: "Add Variable" UI in ScenarioHelper
        - [x] Logic: Ensure custom drivers impact the projection model

## Phase 9: Strategic Financial Engine (Phase 4: Resource Optimization)
- [x] **ROIC Engine Backend**
    - [x] Create `services/gateway/src/data/recommendations.js` (Logic)
    - [x] Create API: `GET /api/v1/recommendations`
    - [x] Logic: Generate insights based on driver values (e.g. High Burn -> Reduce CAC)
- [x] **Frontend: Optimization Widget**
    - [x] Create `OptimizationWidget.jsx` (Cards for "Reduce CAC", "Optimize Cloud Spend")
    - [x] **Interactive Mode**: "Apply" button updates the Projection Sandbox sliders automatically
    - [x] Integrate into `Dashboard.jsx` (Lifting state up)

## Phase 10: AI-Powered Template Generator (Universal Business Intelligence)
- [x] **Transaction Pattern Analyzer**
    - [x] Create `services/gateway/src/engine/transactionAnalyzer.js`
    - [x] Implement vendor clustering (group similar vendors)
    - [x] Implement expense pattern detection
    - [x] Implement transaction characteristic analysis
- [/] **Business Type Classifier (ML)**
    - [x] Infrastructure Ready (ML-Ready)
    - [ ] Waiting for User Data to Train Model
- [x] **Auto-Variable Generator**
    - [x] Create `services/gateway/src/engine/variableGenerator.js`
    - [x] Logic: Auto-generate KPIs based on detected patterns
    - [x] Create confidence scoring system
- [x] **Graph-Based Dependency Engine**
    - [x] Create `services/gateway/src/engine/dependencyGraph.js`
    - [x] Implement "What-If" propagation logic
- [x] **Smart Data Ingestion (OCR Parser)**
    - [x] Create `services/gateway/src/engine/smartIngestion.js`
    - [x] Heuristic parsing for messy/OCR text
- [x] **Progressive UI**
    - [x] Add Standard vs Expert mode toggle
    - [x] Dynamic rendering of components (e.g., hide recommendations in Standard mode)
- [ ] **Continuous Learning**
    - [ ] Build feedback loop (track which variables users keep/delete)
    - [ ] Pattern evolution (suggest new variables as data grows)

## Phase 11: Universal Economic DNA (5 Core Blueprints)
- [x] **Blueprint Detection Engine**
    - [x] Update `TransactionAnalyzer.js` to detect Yield, Throughput, Inventory, Recurring, Expertise.
    - [x] Implement keyword & trigger scoring logic.
- [x] **Blueprint Variable Generator**
    - [x] Update `VariableGenerator.js` to specific KPIs (RevPAR, OEE, GMROI, LTV/CAC, Realization).
    - [x] Add specific "What-If" manipulation logic for each blueprint.
- [x] **ML Training Pipeline**
    - [x] Create `scripts/training/heuristic_preprocessor.py` for training data labeling.
    - [x] Run pre-processor on commercial datasets (SEC/Edgar).
