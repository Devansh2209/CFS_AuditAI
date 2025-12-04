# CFS AuditAI Platform - System Overview

## 1. Executive Summary
The CFS AuditAI Platform is a microservices-based architecture designed to automate, audit, and optimize financial accounting processes. It leverages Artificial Intelligence (AI), Machine Learning (ML), and rule-based engines to ensure compliance with accounting standards (GAAP/IFRS), detect anomalies, and streamline workflow approvals.

## 2. Core Functionality & Logic

### 2.1. Business Logic & Classification Engine
The `business-logic-service` acts as the brain for transaction processing. It uses a multi-layered approach to classify financial transactions:

*   **Industry Profiles:** Pre-defined profiles for Manufacturing, Software, Healthcare, Retail, and Construction. Each profile contains:
    *   **Chart of Accounts (CoA) Structure:** Industry-specific account ranges.
    *   **Critical Accounts:** High-risk accounts requiring monitoring (e.g., "Work in Process" for Manufacturing, "SaaS Revenue" for Software).
    *   **Classification Rules:** Regex-based patterns to automatically map descriptions to accounts.
    *   **KPIs:** Key Performance Indicators like Inventory Turnover or ARR Growth.
*   **Client Rules Engine:** Allows for custom configuration per client, including:
    *   **Vendor Rules:** Maps specific vendors to default accounts.
    *   **Department Rules:** Maps transactions based on department codes and keywords.
    *   **Custom Mappings:** Client-specific regex patterns.
*   **Context-Aware Classification:** The system prioritizes rules in this order:
    1.  Client Vendor Rules (Highest Priority)
    2.  Client Custom Mappings
    3.  Industry Specific Rules
    4.  Department Rules
    5.  Generic Fallback

### 2.2. AI & Machine Learning
The `classification-ai-service` (and `nlp-processing-service`) enhances the rule-based logic:
*   **Ensemble Classification:** Combines rule-based outputs with ML model predictions to increase confidence.
*   **NLP Processing:** Analyzes transaction descriptions to extract context and intent.
*   **Anomaly Detection:** Identifies transactions that deviate from historical patterns or industry norms.

### 2.3. Reclassification & Approval Workflows
The `reclassification-service` manages the correction of accounting entries with strict controls:
*   **Risk Assessment:** Every reclassification proposal is scored based on:
    *   **Amount:** Higher amounts increase risk score.
    *   **Account Type Change:** Switching between Asset/Expense or Revenue/Liability is high risk.
    *   **Income Statement Impact:** Changes affecting Net Income are flagged.
    *   **Timing:** Changes near period-end are scrutinized.
*   **Dynamic Approval Matrix:** The risk score determines the approval chain:
    *   **Low Risk (<20):** 1 Approver (Manager).
    *   **Medium Risk (<50):** 2 Approvers (Manager + Director).
    *   **High Risk (<80):** 3 Approvers (incl. CFO).
    *   **Critical Risk (>80):** 4 Approvers (incl. Audit Committee).
*   **Four-Eyes Principle:** Enforces Segregation of Duties (SoD). The preparer of a reclassification cannot be the approver.
*   **Coercion Detection:** Algorithms analyze approval patterns for suspicious activity (e.g., after-hours approvals, rapid sequences).

### 2.4. Security & Compliance
The `security-auth-service` and `audit-compliance-service` ensure integrity:
*   **Zero Trust Architecture:** Every service-to-service request is authenticated and authorized.
*   **Role-Based Access Control (RBAC):** Granular permissions (PREPARER, APPROVER, REVIEWER, ADMIN).
*   **Immutable Audit Trails:** All actions, especially reclassifications and approvals, are cryptographically hashed and logged.

## 3. Accounting Standards & Policies

The platform is built to support major accounting frameworks, with specific logic for:

### 3.1. US GAAP (ASC)
*   **ASC 606 (Revenue Recognition):**
    *   **Software Industry:** Distinguishes between "Point-in-Time" (License) and "Over-Time" (SaaS/Subscription) revenue recognition.
    *   **Healthcare:** Handles "Patient Service Revenue" net of contractual adjustments.
    *   **Construction:** Supports "Percentage of Completion" method for long-term contracts.
*   **ASC 842 (Leases):** (Implemented in `accounting-standards-service`)
    *   Logic to classify leases as Operating or Finance.
    *   Calculates Right-of-Use (ROU) Assets and Lease Liabilities.

### 3.2. Internal Control Policies
*   **Capitalization Thresholds:** Automatically flags asset purchases below a certain threshold that should be expensed, or expenses above a threshold that should be capitalized.
*   **Approval Limits:** Enforces monetary limits for different approver levels.
*   **Related Party Transactions:** Flags transactions with known related parties for disclosure review.

## 4. Technical Architecture

*   **Microservices:** Node.js (Express) services running in Docker containers.
*   **Frontend:** React (Vite) dashboard for real-time status monitoring.
*   **Gateway:** Nginx API Gateway for routing and load balancing.
*   **Database:** PostgreSQL (mocked for development) for data persistence.
*   **Communication:** RESTful APIs with JSON payloads.

## 5. Algorithms Used

*   **Regex Pattern Matching:** For high-speed, deterministic rule application.
*   **Risk Scoring Algorithm:** Weighted sum model considering amount, account type, and timing.
*   **Cryptographic Hashing (SHA-384):** For generating immutable proofs of approvals and proposals.
*   **Graph-based Dependency Resolution:** (In `workflow-orchestration-service`) For managing complex task dependencies.
