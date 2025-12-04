# Implementation Plan: Complete Business Logic & Audit Services

## Overview
**Goal**: Bring Business Logic Service from 80% → 100% and Audit & Compliance Service from 60% → 100%

**Timeline**: 2-3 weeks  
**Effort**: ~60-80 hours total  
**Dependencies**: PostgreSQL database, Redis cache

---

## Part 1: Business Logic Service (80% → 100%)

### Current State ✅
- Industry profiles defined (manufacturing, software, healthcare, retail, construction)
- Classification rules engine structure built
- Basic validation logic exists

### Missing Components ❌
1. Integration with Classification AI Service
2. Custom rules engine for enterprise customers
3. Database persistence for rules
4. Real-time rule evaluation API
5. Rule conflict resolution

---

### Task 1.1: Database Schema for Business Rules
**Time**: 4 hours

```sql
-- Create tables for business rules
CREATE TABLE industry_profiles (
    id SERIAL PRIMARY KEY,
    industry_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    coa_structure JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE classification_rules (
    id SERIAL PRIMARY KEY,
    industry_id INTEGER REFERENCES industry_profiles(id),
    rule_name VARCHAR(255) NOT NULL,
    pattern TEXT NOT NULL,  -- Regex pattern
    target_category VARCHAR(50) NOT NULL,  -- Operating/Investing/Financing
    priority INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE custom_rules (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL,  -- References users/clients table
    rule_name VARCHAR(255) NOT NULL,
    conditions JSONB NOT NULL,  -- Complex rule conditions
    action JSONB NOT NULL,  -- What to do when rule matches
    priority INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rules_industry ON classification_rules(industry_id);
CREATE INDEX idx_custom_rules_client ON custom_rules(client_id);
```

**Deliverable**: Migration script + seed data for 5 industries

---

### Task 1.2: Rule Evaluation Engine
**Time**: 8 hours

**File**: `/services/business-logic-service/src/ruleEngine.js`

```javascript
class RuleEngine {
  constructor(db, cache) {
    this.db = db;
    this.cache = cache;
  }

  async evaluateTransaction(transaction, industry, clientId) {
    // 1. Load industry rules (cached)
    const industryRules = await this.getIndustryRules(industry);
    
    // 2. Load custom client rules (cached)
    const customRules = await this.getCustomRules(clientId);
    
    // 3. Combine and sort by priority
    const allRules = [...industryRules, ...customRules]
      .sort((a, b) => b.priority - a.priority);
    
    // 4. Evaluate each rule
    for (const rule of allRules) {
      if (this.matchesRule(transaction, rule)) {
        return {
          matched: true,
          rule: rule,
          suggestedCategory: rule.target_category,
          confidence: this.calculateRuleConfidence(rule),
          reasoning: this.generateReasoning(transaction, rule)
        };
      }
    }
    
    return { matched: false };
  }

  matchesRule(transaction, rule) {
    // Pattern matching logic
    const pattern = new RegExp(rule.pattern, 'i');
    return pattern.test(transaction.description);
  }

  calculateRuleConfidence(rule) {
    // Higher priority = higher confidence
    return Math.min(0.95, 0.7 + (rule.priority * 0.05));
  }

  async getIndustryRules(industry) {
    // Check cache first
    const cacheKey = `industry_rules:${industry}`;
    let rules = await this.cache.get(cacheKey);
    
    if (!rules) {
      rules = await this.db.query(
        'SELECT * FROM classification_rules WHERE industry_id = (SELECT id FROM industry_profiles WHERE industry_code = $1) AND active = true',
        [industry]
      );
      await this.cache.set(cacheKey, rules, 3600); // Cache for 1 hour
    }
    
    return rules;
  }
}
```

**Deliverable**: Rule engine with caching + unit tests

---

### Task 1.3: Integration with Classification AI
**Time**: 6 hours

**File**: `/services/business-logic-service/src/integrations/aiService.js`

```javascript
class AIServiceIntegration {
  async enhanceClassification(transaction, aiResult, industry, clientId) {
    const ruleEngine = new RuleEngine(db, cache);
    
    // Get business logic suggestion
    const ruleResult = await ruleEngine.evaluateTransaction(
      transaction, 
      industry, 
      clientId
    );
    
    // Combine AI + Business Logic
    if (ruleResult.matched) {
      // Rule overrides AI if high confidence
      if (ruleResult.confidence > aiResult.confidence) {
        return {
          category: ruleResult.suggestedCategory,
          confidence: ruleResult.confidence,
          source: 'business_rule',
          ai_suggestion: aiResult.category,
          rule_applied: ruleResult.rule.rule_name,
          reasoning: ruleResult.reasoning
        };
      }
      
      // AI and rule agree - boost confidence
      if (ruleResult.suggestedCategory === aiResult.category) {
        return {
          ...aiResult,
          confidence: Math.min(0.99, aiResult.confidence + 0.1),
          source: 'ai_and_rule',
          rule_applied: ruleResult.rule.rule_name
        };
      }
      
      // Conflict - flag for human review
      return {
        category: aiResult.category,
        confidence: 0.5,
        source: 'conflict',
        conflict: {
          ai_suggests: aiResult.category,
          rule_suggests: ruleResult.suggestedCategory
        },
        requires_review: true
      };
    }
    
    // No rule match - use AI
    return {
      ...aiResult,
      source: 'ai_only'
    };
  }
}
```

**Deliverable**: Integration layer + conflict resolution logic

---

### Task 1.4: Custom Rules API
**Time**: 6 hours

**Endpoints**:
```javascript
// Create custom rule
POST /v1/rules/custom
Body: {
  "rule_name": "AWS Credits are Operating",
  "conditions": {
    "description_contains": ["AWS", "cloud"],
    "amount_range": { "min": 0, "max": 100000 }
  },
  "action": {
    "category": "Operating",
    "note": "Cloud infrastructure costs"
  },
  "priority": 10
}

// List custom rules
GET /v1/rules/custom?client_id=123

// Update rule
PUT /v1/rules/custom/:id

// Delete rule
DELETE /v1/rules/custom/:id

// Test rule (dry-run)
POST /v1/rules/custom/test
Body: {
  "rule": { ... },
  "test_transactions": [ ... ]
}
```

**Deliverable**: Full CRUD API for custom rules

---

## Part 2: Audit & Compliance Service (60% → 100%)

### Current State ✅
- Audit trail structure defined
- Compliance checking framework exists
- Basic logging implemented

### Missing Components ❌
1. PostgreSQL database integration
2. Immutable audit log implementation
3. GAAP/IFRS compliance rules
4. SOC 2 evidence collection
5. Audit report generation

---

### Task 2.1: Audit Database Schema
**Time**: 4 hours

```sql
-- Immutable audit trail
CREATE TABLE audit_trail (
    id BIGSERIAL PRIMARY KEY,
    audit_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    transaction_id VARCHAR(255) NOT NULL,
    client_id INTEGER NOT NULL,
    
    -- Original data
    original_description TEXT NOT NULL,
    amount DECIMAL(15, 2),
    transaction_date DATE,
    
    -- Classification
    ai_classification VARCHAR(50),
    ai_confidence DECIMAL(5, 4),
    ai_model_version VARCHAR(50),
    
    business_rule_applied VARCHAR(255),
    final_classification VARCHAR(50) NOT NULL,
    final_confidence DECIMAL(5, 4),
    
    -- Human review
    reviewed_by INTEGER,  -- User ID
    review_timestamp TIMESTAMP,
    review_notes TEXT,
    
    -- Compliance
    gaap_compliant BOOLEAN DEFAULT true,
    ifrs_compliant BOOLEAN DEFAULT true,
    sox_compliant BOOLEAN DEFAULT true,
    compliance_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    ip_address INET,
    user_agent TEXT,
    
    -- Immutability constraint
    CONSTRAINT no_updates CHECK (created_at = created_at)
);

-- Prevent updates/deletes
CREATE RULE audit_trail_no_update AS ON UPDATE TO audit_trail DO INSTEAD NOTHING;
CREATE RULE audit_trail_no_delete AS ON DELETE TO audit_trail DO INSTEAD NOTHING;

-- Compliance checks log
CREATE TABLE compliance_checks (
    id BIGSERIAL PRIMARY KEY,
    audit_id UUID REFERENCES audit_trail(audit_id),
    check_type VARCHAR(50) NOT NULL,  -- GAAP, IFRS, SOX
    check_name VARCHAR(255) NOT NULL,
    passed BOOLEAN NOT NULL,
    details JSONB,
    checked_at TIMESTAMP DEFAULT NOW()
);

-- SOC 2 evidence
CREATE TABLE soc2_evidence (
    id BIGSERIAL PRIMARY KEY,
    evidence_type VARCHAR(100) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    evidence_data JSONB NOT NULL,
    generated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_transaction ON audit_trail(transaction_id);
CREATE INDEX idx_audit_client ON audit_trail(client_id);
CREATE INDEX idx_audit_created ON audit_trail(created_at);
```

**Deliverable**: Migration script + immutability tests

---

### Task 2.2: Audit Trail Service
**Time**: 8 hours

**File**: `/services/audit-compliance-service/src/auditTrail.js`

```javascript
class AuditTrailService {
  async createAuditRecord(data) {
    const {
      transaction_id,
      client_id,
      original_description,
      amount,
      transaction_date,
      ai_classification,
      ai_confidence,
      ai_model_version,
      business_rule_applied,
      final_classification,
      final_confidence,
      ip_address,
      user_agent
    } = data;
    
    // Insert immutable record
    const result = await db.query(`
      INSERT INTO audit_trail (
        transaction_id, client_id, original_description, amount,
        transaction_date, ai_classification, ai_confidence,
        ai_model_version, business_rule_applied, final_classification,
        final_confidence, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING audit_id, created_at
    `, [
      transaction_id, client_id, original_description, amount,
      transaction_date, ai_classification, ai_confidence,
      ai_model_version, business_rule_applied, final_classification,
      final_confidence, ip_address, user_agent
    ]);
    
    const auditId = result.rows[0].audit_id;
    
    // Run compliance checks
    await this.runComplianceChecks(auditId, data);
    
    return {
      audit_id: auditId,
      created_at: result.rows[0].created_at
    };
  }

  async runComplianceChecks(auditId, data) {
    const checks = [
      this.checkGAAP(data),
      this.checkIFRS(data),
      this.checkSOX(data)
    ];
    
    const results = await Promise.all(checks);
    
    // Log each check
    for (const check of results) {
      await db.query(`
        INSERT INTO compliance_checks (audit_id, check_type, check_name, passed, details)
        VALUES ($1, $2, $3, $4, $5)
      `, [auditId, check.type, check.name, check.passed, check.details]);
    }
    
    // Update audit trail with compliance status
    const allPassed = results.every(r => r.passed);
    await db.query(`
      UPDATE audit_trail 
      SET gaap_compliant = $1, ifrs_compliant = $2, sox_compliant = $3
      WHERE audit_id = $4
    `, [
      results[0].passed,  // GAAP
      results[1].passed,  // IFRS
      results[2].passed,  // SOX
      auditId
    ]);
  }

  async checkGAAP(data) {
    // GAAP compliance rules
    const rules = [
      {
        name: 'Cash Flow Classification',
        check: () => ['Operating', 'Investing', 'Financing'].includes(data.final_classification)
      },
      {
        name: 'Debt Repayment is Financing',
        check: () => {
          if (data.original_description.match(/debt repayment|loan payment/i)) {
            return data.final_classification === 'Financing';
          }
          return true;
        }
      },
      {
        name: 'Dividends are Financing',
        check: () => {
          if (data.original_description.match(/dividend/i)) {
            return data.final_classification === 'Financing';
          }
          return true;
        }
      }
    ];
    
    const results = rules.map(rule => ({
      rule: rule.name,
      passed: rule.check()
    }));
    
    return {
      type: 'GAAP',
      name: 'GAAP Compliance Check',
      passed: results.every(r => r.passed),
      details: results
    };
  }
}
```

**Deliverable**: Audit trail service + compliance checking

---

### Task 2.3: SOC 2 Evidence Collection
**Time**: 6 hours

```javascript
class SOC2EvidenceCollector {
  async generateEvidenceReport(periodStart, periodEnd) {
    // Collect evidence for SOC 2 audit
    const evidence = {
      access_controls: await this.collectAccessControls(periodStart, periodEnd),
      audit_logs: await this.collectAuditLogs(periodStart, periodEnd),
      change_management: await this.collectChangeManagement(periodStart, periodEnd),
      monitoring: await this.collectMonitoring(periodStart, periodEnd)
    };
    
    // Store evidence
    await db.query(`
      INSERT INTO soc2_evidence (evidence_type, period_start, period_end, evidence_data)
      VALUES ('comprehensive_report', $1, $2, $3)
    `, [periodStart, periodEnd, evidence]);
    
    return evidence;
  }

  async collectAuditLogs(periodStart, periodEnd) {
    // Get all audit trail entries for period
    const logs = await db.query(`
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(DISTINCT client_id) as unique_clients,
        COUNT(CASE WHEN reviewed_by IS NOT NULL THEN 1 END) as human_reviewed,
        AVG(final_confidence) as avg_confidence
      FROM audit_trail
      WHERE created_at BETWEEN $1 AND $2
    `, [periodStart, periodEnd]);
    
    return logs.rows[0];
  }
}
```

**Deliverable**: SOC 2 evidence collection + report generation

---

### Task 2.4: Audit Report API
**Time**: 8 hours

**Endpoints**:
```javascript
// Get audit trail for transaction
GET /v1/audit/trail/:transaction_id

// Get audit report for client
GET /v1/audit/report?client_id=123&start_date=2024-01-01&end_date=2024-12-31

// Generate SOC 2 evidence
POST /v1/compliance/soc2/evidence
Body: {
  "period_start": "2024-01-01",
  "period_end": "2024-12-31"
}

// Download audit report (PDF)
GET /v1/audit/report/download?format=pdf&client_id=123
```

**Deliverable**: Full audit reporting API + PDF generation

---

## Timeline & Effort Breakdown

| Task | Component | Hours | Priority |
|------|-----------|-------|----------|
| 1.1 | Business Logic DB Schema | 4 | High |
| 1.2 | Rule Evaluation Engine | 8 | High |
| 1.3 | AI Service Integration | 6 | High |
| 1.4 | Custom Rules API | 6 | Medium |
| 2.1 | Audit DB Schema | 4 | High |
| 2.2 | Audit Trail Service | 8 | High |
| 2.3 | SOC 2 Evidence | 6 | Medium |
| 2.4 | Audit Report API | 8 | High |
| **Testing** | Unit + Integration Tests | 12 | High |
| **Documentation** | API Docs + User Guides | 8 | Medium |

**Total**: 70 hours (~2-3 weeks for 1 developer)

---

## Dependencies

### Infrastructure
- ✅ PostgreSQL database (already exists)
- ✅ Redis cache (already exists)
- ⏳ PDF generation library (`jsPDF` or `pdfkit`)

### External Services
- ✅ Classification AI Service (for integration)
- ⏳ User/Client management service (for client_id references)

---

## Testing Strategy

### Unit Tests
- Rule matching logic
- Compliance checking functions
- Audit trail creation

### Integration Tests
- End-to-end classification flow (AI → Business Logic → Audit)
- Custom rule creation and application
- SOC 2 evidence generation

### Load Tests
- 1000 transactions/second
- Rule evaluation performance
- Database write performance (audit trail)

---

## Success Criteria

### Business Logic Service (100%)
- ✅ All 5 industry profiles loaded in database
- ✅ Rule engine evaluates 1000 rules/second
- ✅ Custom rules API fully functional
- ✅ Integration with AI service working
- ✅ 95%+ test coverage

### Audit & Compliance Service (100%)
- ✅ Immutable audit trail (cannot update/delete)
- ✅ All GAAP/IFRS/SOX checks implemented
- ✅ SOC 2 evidence collection automated
- ✅ Audit reports generate in < 5 seconds
- ✅ 95%+ test coverage

---

## Next Steps (Immediate)

1. **Week 1**: Database schemas + core services
   - Day 1-2: Create DB schemas (Tasks 1.1, 2.1)
   - Day 3-4: Build rule engine (Task 1.2)
   - Day 5: Build audit trail service (Task 2.2)

2. **Week 2**: Integration + APIs
   - Day 1-2: AI service integration (Task 1.3)
   - Day 3-4: Custom rules API (Task 1.4)
   - Day 5: SOC 2 evidence (Task 2.3)

3. **Week 3**: Reporting + Testing
   - Day 1-2: Audit report API (Task 2.4)
   - Day 3-4: Testing
   - Day 5: Documentation

**Ready to start?** I can begin with Task 1.1 (Business Logic DB Schema) right now!
