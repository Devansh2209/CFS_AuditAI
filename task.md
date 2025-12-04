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

## Phase 4: Deployment Preparation
- [ ] **Create Deployment Guide**
    - [ ] Environment setup instructions
    - [ ] Service startup procedures
    - [ ] Testing checklist

- [ ] **Final Verification**
    - [ ] Test full user workflow
    - [ ] Verify all services communicate
    - [ ] Document any issues
