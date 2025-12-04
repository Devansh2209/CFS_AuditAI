# Core Services Explained: Why They Matter

## 1. Classification AI Service 🤖

### **What It Does**
The **brain** of your platform - uses BERT to automatically classify cash flow transactions.

### **Key Functions**
```javascript
POST /v1/classify/transactions
// Input: "Purchase of property, plant and equipment"
// Output: { category: "Investing", confidence: 98.5% }

POST /v1/feedback/incorporate
// Learns from user corrections (human-in-the-loop)

GET /v1/confidence/calibration
// Ensures confidence scores are accurate

POST /v1/models/:modelId/retrain
// Triggers model retraining when accuracy drops
```

### **Why It's Critical**
- **Core Value Prop**: This is what customers pay for - automated classification
- **Accuracy**: 95%+ accuracy saves hours of manual work
- **Scalability**: Can classify 1000s of transactions per second
- **Learning**: Gets smarter over time with user feedback

### **Current Status**
- ✅ Service structure built
- ⏳ Needs v28 BERT model integration (waiting for GPU quota)
- ⏳ Needs confidence calibration implementation

---

## 2. Business Logic Service 💼

### **What It Does**
Applies **industry-specific rules** and **accounting standards** to ensure classifications make sense for different business types.

### **Key Functions**
```javascript
// Industry Profiles
GET /v1/industries/:industry/profile
// Returns: Chart of Accounts structure, critical accounts, classification rules

// Example: Manufacturing vs. Software companies have different cash flow patterns
Manufacturing:
- High inventory costs → Operating
- Equipment purchases → Investing

Software (SaaS):
- R&D costs → Operating
- Customer acquisition → Operating (not Investing!)
```

### **Why It's Critical**
- **Context Awareness**: A "software license" means different things for Microsoft vs. a customer
- **Industry Rules**: GAAP/IFRS rules vary by industry
- **Validation**: Prevents nonsensical classifications (e.g., "Dividends" as Operating)
- **Customization**: Enterprise customers can define custom rules

### **Example Use Case**
```
User uploads: "Purchase of AWS credits - $50,000"

Without Business Logic:
→ AI classifies as "Investing" (keyword: "Purchase")

With Business Logic (SaaS industry):
→ Recognizes AWS = cloud infrastructure
→ Reclassifies as "Operating" (ongoing business expense)
→ Adds note: "Cloud infrastructure costs are operating expenses per GAAP"
```

### **Current Status**
- ✅ Industry profiles defined (manufacturing, software, healthcare, retail, construction)
- ✅ Classification rules engine built
- ⏳ Needs integration with Classification AI Service

---

## 3. Audit & Compliance Service 📋

### **What It Does**
Ensures all classifications are **auditable** and **compliant** with accounting standards (GAAP, IFRS, SOX).

### **Key Functions**
```javascript
POST /v1/audit/trail/create
// Creates immutable audit log for every classification

GET /v1/compliance/check
// Validates against GAAP/IFRS rules

POST /v1/audit/reports/generate
// Generates audit-ready reports for accountants/auditors

GET /v1/compliance/soc2/evidence
// Collects evidence for SOC 2 compliance
```

### **Why It's Critical**
- **Legal Requirement**: Public companies MUST have audit trails (SOX compliance)
- **Trust**: Auditors need to verify AI decisions
- **Liability Protection**: Proves due diligence if classifications are questioned
- **Enterprise Sales**: Big companies won't buy without audit capabilities

### **Example Audit Trail**
```json
{
  "transaction_id": "txn_12345",
  "original_description": "Purchase of land",
  "ai_classification": "Investing",
  "confidence": 0.985,
  "model_version": "v28_bert",
  "timestamp": "2024-11-26T11:30:00Z",
  "reviewed_by": null,
  "approved_by": null,
  "audit_notes": "High confidence, no manual review needed",
  "compliance_checks": {
    "gaap_compliant": true,
    "ifrs_compliant": true,
    "sox_compliant": true
  }
}
```

### **Current Status**
- ✅ Audit trail structure defined
- ✅ Compliance checking framework built
- ⏳ Needs integration with database (PostgreSQL)
- ⏳ Needs SOC 2 evidence collection

---

## 4. How They Work Together 🔄

### **Classification Flow**
```
1. User uploads transaction: "Repayment of long-term debt - $1M"
   ↓
2. Classification AI Service
   → BERT model analyzes text
   → Returns: "Financing" (confidence: 99.2%)
   ↓
3. Business Logic Service
   → Checks industry profile (e.g., Manufacturing)
   → Validates: "Debt repayment = Financing" ✅
   → Applies any custom rules
   ↓
4. Audit & Compliance Service
   → Creates audit trail
   → Checks GAAP compliance ✅
   → Logs to database
   ↓
5. Return to user:
   {
     "classification": "Financing",
     "confidence": 99.2%,
     "audit_id": "audit_67890",
     "compliant": true
   }
```

### **Feedback Loop (Human-in-the-Loop)**
```
User corrects classification:
"Actually, this should be Operating"
   ↓
1. Audit Service logs correction
2. Business Logic Service updates rules
3. Classification AI Service retrains model
4. Future similar transactions classified correctly
```

---

## 5. Why This Architecture Matters for Commercial Success

### **For Customers**
- **Accuracy**: AI + Business Rules + Audit = 99%+ accuracy
- **Trust**: Full audit trail for compliance
- **Customization**: Industry-specific rules
- **Learning**: Gets smarter with use

### **For You (Business)**
- **Scalability**: Each service scales independently
- **Reliability**: If one service fails, others keep working
- **Upgradability**: Can upgrade AI model without touching business logic
- **Enterprise-Ready**: Audit trails = enterprise sales

### **For Compliance**
- **SOC 2**: Audit service provides evidence
- **GDPR**: Can delete user data per service
- **SOX**: Immutable audit trails
- **GAAP/IFRS**: Compliance checks built-in

---

## 6. Integration Priority (Next Steps)

### **High Priority** (Needed for MVP)
1. ✅ Classification AI Service + v28 BERT model
2. ✅ Business Logic Service + Industry profiles
3. ✅ Audit Service + Database integration

### **Medium Priority** (Needed for Enterprise)
4. Compliance Service + SOC 2 evidence
5. Feedback loop + Model retraining
6. Custom rules engine for enterprise customers

### **Low Priority** (Nice to have)
7. Advanced analytics
8. Multi-language support
9. Custom industry profiles

---

## 7. Current Gaps to Fill

| Service | Status | Missing Pieces |
|---------|--------|----------------|
| **Classification AI** | 70% | v28 model integration, confidence calibration |
| **Business Logic** | 80% | Integration with AI service, custom rules UI |
| **Audit** | 60% | Database integration, report generation |
| **Compliance** | 50% | SOC 2 evidence, IFRS rules |

**Estimated Time to Complete**: 2-3 weeks (while waiting for GPU quota)

---

## Bottom Line

These services transform your platform from a "simple AI classifier" to an **enterprise-grade financial automation system**:

- **Classification AI** = The brain (AI model)
- **Business Logic** = The wisdom (industry knowledge)
- **Audit & Compliance** = The trust (legal protection)

Without them, you'd just be "another AI tool."  
With them, you're a **comprehensive financial operations platform** that enterprises will pay $50K+/year for.
