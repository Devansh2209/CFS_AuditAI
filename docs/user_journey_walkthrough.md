# Commercial User Journey: Cashflow AI

## Overview
This document outlines the end-to-end workflow for a commercial user (e.g., a financial analyst or accountant) using the Cashflow AI platform. It describes the inputs they provide, the processing that happens, and the results they receive.

**Goal**: To validate financial transaction data, classify it automatically, and ensure compliance with accounting standards (GAAP/IFRS).

---

## Step 1: Authentication & Onboarding
**Input**: User credentials.
**Action**:
1.  User logs in via the Web Dashboard or API.
2.  User generates an **API Key** for their accounting software integration (e.g., QuickBooks, Xero).

```json
// Example API Key Generation Request
POST /api/v1/auth/api-keys
{
  "name": "QuickBooks Integration",
  "scopes": ["classify", "read_reports"]
}
```

**Output**: A secure API Key (`sk_live_...`) to use for all subsequent requests.

---

## Step 2: Data Input (The "Weekly" Workflow)
A commercial user typically processes data in batches (e.g., weekly or monthly).

### Option A: API Integration (Automated)
The user's system sends individual transactions or batches automatically.

**Input Format (JSON)**:
```json
{
  "transaction_id": "txn_123456789",
  "date": "2024-11-26",
  "amount": 5000.00,
  "currency": "USD",
  "description": "AWS CLOUD SERVICES - INV #998877",
  "merchant": "Amazon Web Services",
  "metadata": {
    "department": "Engineering",
    "project": "Cashflow AI"
  }
}
```

### Option B: Bulk Upload (Manual)
The user uploads a CSV file exported from their bank.

**Input Format (CSV)**:
```csv
Date,Description,Amount,Currency,Merchant
2024-11-26,"AWS CLOUD SERVICES",5000.00,USD,"Amazon Web Services"
2024-11-25,"WEWORK RENT",2500.00,USD,"WeWork"
2024-11-24,"DELTA AIR LINES",450.00,USD,"Delta"
```

---

## Step 3: The "Black Box" Processing
Once data is received, the Cashflow AI engine performs the following:

1.  **Security Check**: Validates API key, checks rate limits, and scans for malicious input (SQLi/XSS).
2.  **Enrichment**:
    *   Identifies the merchant (e.g., "AWS" -> "Amazon Web Services").
    *   Determines the industry sector (e.g., "Technology > Cloud Infrastructure").
3.  **Classification (The Core Value)**:
    *   **Rule Engine**: Checks against 1000+ predefined accounting rules (e.g., "AWS" = "Software & Subscription Costs").
    *   **AI Model**: If no rule matches, the BERT model analyzes the description context to predict the category.
    *   **Confidence Score**: Assigns a score (0-100%) to the classification.
4.  **Compliance Check**:
    *   Flags suspicious transactions (e.g., duplicate amounts, weekend transactions for B2B).
    *   Ensures GAAP compliance for the assigned category.

---

## Step 4: Results & Output
The user receives immediate feedback.

**API Response**:
```json
{
  "transaction_id": "txn_123456789",
  "status": "classified",
  "classification": {
    "category": "Software & Subscription Costs",
    "gl_code": "600-10",
    "confidence": 0.98,
    "source": "rule_engine",
    "rule_matched": "aws_cloud_services"
  },
  "compliance": {
    "flagged": false,
    "notes": "GAAP compliant expense."
  },
  "audit_trail_id": "log_99887766"
}
```

---

## Step 5: Validation & Review (The "Human in the Loop")
For transactions with **low confidence** (<80%) or **compliance flags**, the user is notified to review.

**User Action**:
1.  Opens the **Review Dashboard**.
2.  Sees a list of "Flagged Transactions".
3.  **Action**:
    *   **Approve**: Accepts the AI's suggestion.
    *   **Reclassify**: Manually selects the correct category (e.g., changes "Travel" to "Client Entertainment").
    *   **Create Rule**: "Always classify 'Steakhouse' as 'Client Entertainment'".

**System Learning**:
*   When the user manually reclassifies, the system creates a **Custom Rule** or retrains the AI model, so it doesn't make the same mistake next week.

---

## Summary of Value
1.  **Speed**: Processes thousands of transactions in seconds vs. hours of manual entry.
2.  **Accuracy**: Reduces human error in GL coding.
3.  **Audit Trail**: Every decision (AI or Human) is logged for tax audits.
4.  **Security**: Bank-grade encryption and access control.
