// services/business-logic-service/src/index.js
const express = require('express');
const { body, param, validationResult } = require('express-validator');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    service: 'business-logic-service',
    status: 'active',
    version: '1.0.0'
  });
});

// ==========================================
// INDUSTRY PROFILES
// ==========================================

class IndustryProfiles {
  static getProfile(industry) {
    const profiles = {
      manufacturing: this.manufacturingProfile(),
      software: this.softwareProfile(),
      healthcare: this.healthcareProfile(),
      retail: this.retailProfile(),
      construction: this.constructionProfile()
    };

    return profiles[industry] || this.defaultProfile();
  }

  static manufacturingProfile() {
    return {
      industry: 'manufacturing',
      coaStructure: {
        assets: { range: '1000-1999', emphasis: 'inventory_ppe' },
        cogs: { range: '5000-5999', detailed: true }
      },
      criticalAccounts: [
        { code: '1300', name: 'Raw Materials Inventory', monitoring: 'high' },
        { code: '1310', name: 'Work in Process', monitoring: 'high' },
        { code: '1320', name: 'Finished Goods', monitoring: 'high' },
        { code: '1500', name: 'Property, Plant & Equipment', monitoring: 'medium' },
        { code: '5000', name: 'Cost of Goods Sold', monitoring: 'high' }
      ],
      classificationRules: [
        {
          pattern: /raw material|steel|aluminum|components/i,
          account: 'Raw Materials Inventory',
          code: '1300',
          notes: 'Materials not yet in production'
        },
        {
          pattern: /factory|plant|manufacturing overhead/i,
          account: 'Manufacturing Overhead',
          code: '5100',
          notes: 'Indirect manufacturing costs'
        },
        {
          pattern: /depreciation.*equipment|machinery depreciation/i,
          account: 'Manufacturing Depreciation',
          code: '5150',
          notes: 'Allocate to COGS'
        },
        {
          pattern: /direct labor|production wages/i,
          account: 'Direct Labor',
          code: '5050',
          notes: 'Labor directly tied to production'
        }
      ],
      kpis: [
        { metric: 'inventory_turnover', target: 6, threshold: 4 },
        { metric: 'gross_margin', target: 0.35, threshold: 0.25 },
        { metric: 'capacity_utilization', target: 0.85, threshold: 0.70 }
      ],
      fluctuationThresholds: {
        inventory: 0.15,  // 15% variance triggers review
        cogs: 0.10,       // 10% variance in COGS
        labor: 0.12       // 12% variance in labor costs
      }
    };
  }

  static softwareProfile() {
    return {
      industry: 'software',
      coaStructure: {
        assets: { range: '1000-1999', emphasis: 'intangible_assets' },
        revenue: { range: '4000-4999', detailed: true }
      },
      criticalAccounts: [
        { code: '1400', name: 'Capitalized Software Development', monitoring: 'high' },
        { code: '2400', name: 'Deferred Revenue', monitoring: 'high' },
        { code: '4000', name: 'SaaS Revenue', monitoring: 'high' },
        { code: '4100', name: 'License Revenue', monitoring: 'medium' },
        { code: '4200', name: 'Professional Services Revenue', monitoring: 'medium' }
      ],
      classificationRules: [
        {
          pattern: /subscription|saas|recurring/i,
          account: 'SaaS Revenue',
          code: '4000',
          notes: 'Recognize over subscription period',
          revenueRecognition: 'over_time'
        },
        {
          pattern: /perpetual license|software license/i,
          account: 'License Revenue',
          code: '4100',
          notes: 'Point-in-time recognition',
          revenueRecognition: 'point_in_time'
        },
        {
          pattern: /implementation|consulting|professional service/i,
          account: 'Professional Services Revenue',
          code: '4200',
          notes: 'Recognize as services delivered',
          revenueRecognition: 'over_time'
        },
        {
          pattern: /r&d|research|development|engineering/i,
          account: 'Research & Development',
          code: '6000',
          notes: 'Evaluate capitalization criteria',
          requiresReview: true
        },
        {
          pattern: /hosting|cloud|aws|azure/i,
          account: 'Cloud Infrastructure',
          code: '6100',
          notes: 'Recurring operational expense'
        }
      ],
      kpis: [
        { metric: 'arr_growth', target: 0.30, threshold: 0.15 },
        { metric: 'net_revenue_retention', target: 1.10, threshold: 0.95 },
        { metric: 'gross_margin', target: 0.80, threshold: 0.70 },
        { metric: 'rule_of_40', target: 40, threshold: 25 }
      ],
      fluctuationThresholds: {
        revenue: 0.08,
        rd_expense: 0.20,
        sales_marketing: 0.15
      },
      specialConsiderations: {
        asc606: true,
        deferredRevenue: 'critical',
        capitalizedDevelopment: 'requires_judgment'
      }
    };
  }

  static healthcareProfile() {
    return {
      industry: 'healthcare',
      coaStructure: {
        assets: { range: '1000-1999', emphasis: 'accounts_receivable' },
        revenue: { range: '4000-4999', detailed: true }
      },
      criticalAccounts: [
        { code: '1200', name: 'Patient Accounts Receivable', monitoring: 'high' },
        { code: '1210', name: 'Allowance for Doubtful Accounts', monitoring: 'high' },
        { code: '1220', name: 'Insurance Receivables', monitoring: 'high' },
        { code: '4000', name: 'Patient Service Revenue', monitoring: 'high' },
        { code: '4100', name: 'Contractual Adjustments', monitoring: 'high' }
      ],
      classificationRules: [
        {
          pattern: /patient revenue|service revenue|medical service/i,
          account: 'Patient Service Revenue',
          code: '4000',
          notes: 'Net of contractual adjustments'
        },
        {
          pattern: /bad debt|doubtful|uncollectible/i,
          account: 'Bad Debt Expense',
          code: '6500',
          notes: 'Historical collection rates apply'
        },
        {
          pattern: /medicare|medicaid|insurance/i,
          account: 'Insurance Receivables',
          code: '1220',
          notes: 'Government payor - monitor aging'
        }
      ],
      kpis: [
        { metric: 'days_in_ar', target: 45, threshold: 60 },
        { metric: 'collection_rate', target: 0.95, threshold: 0.85 },
        { metric: 'operating_margin', target: 0.15, threshold: 0.08 }
      ],
      fluctuationThresholds: {
        revenue: 0.10,
        bad_debt: 0.25,
        accounts_receivable: 0.15
      },
      specialConsiderations: {
        revenueRecognition: 'complex',
        regulatoryCompliance: 'hipaa',
        allowances: 'significant_estimates'
      }
    };
  }

  static retailProfile() {
    return {
      industry: 'retail',
      criticalAccounts: [
        { code: '1300', name: 'Merchandise Inventory', monitoring: 'high' },
        { code: '5000', name: 'Cost of Goods Sold', monitoring: 'high' },
        { code: '6200', name: 'Store Operating Expenses', monitoring: 'medium' }
      ],
      classificationRules: [
        {
          pattern: /inventory|merchandise|stock/i,
          account: 'Merchandise Inventory',
          code: '1300'
        },
        {
          pattern: /shrinkage|theft|loss/i,
          account: 'Inventory Shrinkage',
          code: '5200'
        }
      ],
      kpis: [
        { metric: 'inventory_turnover', target: 8, threshold: 5 },
        { metric: 'comp_store_sales', target: 0.03, threshold: -0.02 }
      ],
      fluctuationThresholds: {
        inventory: 0.20,
        sales: 0.15
      }
    };
  }

  static constructionProfile() {
    return {
      industry: 'construction',
      criticalAccounts: [
        { code: '1350', name: 'Construction in Progress', monitoring: 'high' },
        { code: '1360', name: 'Contract Receivables', monitoring: 'high' },
        { code: '2300', name: 'Billings in Excess of Costs', monitoring: 'high' }
      ],
      classificationRules: [
        {
          pattern: /job cost|project cost|construction/i,
          account: 'Construction in Progress',
          code: '1350',
          notes: 'Job costing required'
        },
        {
          pattern: /retention|retainage/i,
          account: 'Contract Retainage Receivable',
          code: '1365',
          notes: 'Typically 5-10% of contract value'
        }
      ],
      kpis: [
        { metric: 'gross_profit_margin', target: 0.25, threshold: 0.15 },
        { metric: 'backlog', target: 12, threshold: 6 }
      ],
      fluctuationThresholds: {
        job_costs: 0.12,
        revenue: 0.15
      },
      specialConsiderations: {
        percentageOfCompletion: true,
        jobCosting: 'required'
      }
    };
  }

  static defaultProfile() {
    return {
      industry: 'general',
      criticalAccounts: [],
      classificationRules: [],
      kpis: [],
      fluctuationThresholds: {
        default: 0.10
      }
    };
  }
}

// ==========================================
// CLIENT-SPECIFIC RULES ENGINE
// ==========================================

class ClientRulesEngine {
  static clientRules = new Map(); // In production, use database

  static configureClient(clientId, config) {
    const rules = {
      clientId,
      customMappings: config.customMappings || [],
      vendorRules: config.vendorRules || [],
      departmentRules: config.departmentRules || [],
      thresholds: config.thresholds || {},
      approvalWorkflows: config.approvalWorkflows || {},
      createdAt: new Date().toISOString()
    };

    this.clientRules.set(clientId, rules);
    return rules;
  }

  static getClientRules(clientId) {
    return this.clientRules.get(clientId) || this.getDefaultRules(clientId);
  }

  static getDefaultRules(clientId) {
    return {
      clientId,
      customMappings: [],
      vendorRules: [],
      departmentRules: [],
      thresholds: { materiality: 50000 },
      approvalWorkflows: {}
    };
  }

  static applyVendorRule(transaction, clientRules) {
    if (!transaction.vendor) return null;

    const vendorRule = clientRules.vendorRules.find(
      r => r.vendorName.toLowerCase() === transaction.vendor.toLowerCase()
    );

    if (vendorRule) {
      return {
        account: vendorRule.defaultAccount,
        accountCode: vendorRule.accountCode,
        department: vendorRule.department,
        notes: `Applied vendor rule for ${transaction.vendor}`,
        confidence: 1.0,
        source: 'vendor_rule'
      };
    }

    return null;
  }

  static applyDepartmentRule(transaction, clientRules) {
    if (!transaction.department) return null;

    const deptRule = clientRules.departmentRules.find(
      r => r.department === transaction.department
    );

    if (deptRule && transaction.description) {
      const keyword = deptRule.keywords.find(
        k => transaction.description.toLowerCase().includes(k.toLowerCase())
      );

      if (keyword) {
        return {
          account: deptRule.defaultAccount,
          accountCode: deptRule.accountCode,
          notes: `Applied department rule: ${transaction.department} - ${keyword}`,
          confidence: 0.9,
          source: 'department_rule'
        };
      }
    }

    return null;
  }

  static applyCustomMapping(transaction, clientRules) {
    if (!transaction.description) return null;

    const mapping = clientRules.customMappings.find(m => {
      const pattern = new RegExp(m.pattern, 'i');
      return pattern.test(transaction.description);
    });

    if (mapping) {
      return {
        account: mapping.account,
        accountCode: mapping.accountCode,
        notes: `Applied custom mapping: ${mapping.name}`,
        confidence: 0.95,
        source: 'custom_mapping'
      };
    }

    return null;
  }
}

// ==========================================
// TRANSACTION CLASSIFICATION WITH CONTEXT
// ==========================================

class BusinessContextClassifier {
  static classifyWithContext(transaction, clientId, industry) {
    // Get industry profile
    const industryProfile = IndustryProfiles.getProfile(industry);

    // Get client-specific rules
    const clientRules = ClientRulesEngine.getClientRules(clientId);

    // Classification priority:
    // 1. Client-specific vendor rules (highest)
    // 2. Client custom mappings
    // 3. Industry-specific rules
    // 4. Department rules
    // 5. Generic classification (fallback)

    let classification = null;

    // Try vendor rule first
    classification = ClientRulesEngine.applyVendorRule(transaction, clientRules);
    if (classification) {
      classification.priority = 1;
      return this.enrichClassification(classification, transaction, industryProfile);
    }

    // Try custom mapping
    classification = ClientRulesEngine.applyCustomMapping(transaction, clientRules);
    if (classification) {
      classification.priority = 2;
      return this.enrichClassification(classification, transaction, industryProfile);
    }

    // Try industry rule
    classification = this.applyIndustryRule(transaction, industryProfile);
    if (classification) {
      classification.priority = 3;
      return this.enrichClassification(classification, transaction, industryProfile);
    }

    // Try department rule
    classification = ClientRulesEngine.applyDepartmentRule(transaction, clientRules);
    if (classification) {
      classification.priority = 4;
      return this.enrichClassification(classification, transaction, industryProfile);
    }

    // Fallback generic classification
    return this.genericClassification(transaction);
  }

  static applyIndustryRule(transaction, industryProfile) {
    if (!transaction.description) return null;

    const rule = industryProfile.classificationRules.find(r =>
      r.pattern.test(transaction.description)
    );

    if (rule) {
      return {
        account: rule.account,
        accountCode: rule.code,
        notes: rule.notes,
        confidence: 0.85,
        source: 'industry_rule',
        requiresReview: rule.requiresReview || false,
        revenueRecognition: rule.revenueRecognition
      };
    }

    return null;
  }

  static enrichClassification(classification, transaction, industryProfile) {
    // Add industry-specific context
    const criticalAccount = industryProfile.criticalAccounts.find(
      a => a.code === classification.accountCode
    );

    if (criticalAccount) {
      classification.monitoring = criticalAccount.monitoring;
      classification.critical = true;
    }

    // Add fluctuation threshold
    const accountType = this.getAccountType(classification.accountCode);
    classification.fluctuationThreshold =
      industryProfile.fluctuationThresholds[accountType] ||
      industryProfile.fluctuationThresholds.default || 0.10;

    // Add KPI relevance
    classification.kpiRelevant = this.isKpiRelevant(
      classification.accountCode,
      industryProfile.kpis
    );

    return classification;
  }

  static getAccountType(accountCode) {
    const code = parseInt(accountCode);
    if (code >= 1000 && code < 2000) return 'assets';
    if (code >= 2000 && code < 3000) return 'liabilities';
    if (code >= 3000 && code < 4000) return 'equity';
    if (code >= 4000 && code < 5000) return 'revenue';
    if (code >= 5000 && code < 6000) return 'cogs';
    if (code >= 6000) return 'expense';
    return 'unknown';
  }

  static isKpiRelevant(accountCode, kpis) {
    // Simplified - in production, map account codes to KPIs
    return kpis.length > 0;
  }

  static genericClassification(transaction) {
    return {
      account: 'Unclassified',
      accountCode: '9999',
      notes: 'Requires manual classification',
      confidence: 0.3,
      source: 'generic',
      requiresReview: true,
      priority: 5
    };
  }
}

// ==========================================
// POLICY ENGINE
// ==========================================

class PolicyEngine {
  static enforcePolicy(transaction, clientPolicies) {
    const violations = [];
    const warnings = [];

    // Capitalization policy
    if (clientPolicies.capitalizationThreshold) {
      const threshold = clientPolicies.capitalizationThreshold;
      if (transaction.amount >= threshold &&
        transaction.type === 'asset' &&
        !transaction.capitalized) {
        violations.push({
          policy: 'capitalization',
          severity: 'high',
          message: `Transaction exceeds $${threshold} threshold - should be capitalized`
        });
      }
    }

    // Approval policy
    if (clientPolicies.approvalLimits) {
      const limit = clientPolicies.approvalLimits[transaction.category] ||
        clientPolicies.approvalLimits.default;
      if (transaction.amount > limit && !transaction.approvedBy) {
        violations.push({
          policy: 'approval',
          severity: 'high',
          message: `Transaction exceeds approval limit of $${limit}`
        });
      }
    }

    // Related party policy
    if (clientPolicies.relatedPartyReview && transaction.isRelatedParty) {
      warnings.push({
        policy: 'related_party',
        severity: 'medium',
        message: 'Related party transaction - requires disclosure review'
      });
    }

    return {
      compliant: violations.length === 0,
      violations,
      warnings,
      requiresAction: violations.some(v => v.severity === 'high')
    };
  }
}

// ==========================================
// API ENDPOINTS
// ==========================================

// POST /v1/transactions/classify-with-context
app.post('/v1/transactions/classify-with-context', [
  body('transaction').isObject(),
  body('clientId').isString(),
  body('industry').isString()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { transaction, clientId, industry } = req.body;

  try {
    const classification = BusinessContextClassifier.classifyWithContext(
      transaction,
      clientId,
      industry
    );

    res.json({
      success: true,
      transactionId: transaction.id,
      classification,
      industry,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /v1/rules/client/:clientId/configure
app.post('/v1/rules/client/:clientId/configure', [
  param('clientId').isString(),
  body('config').isObject()
], (req, res) => {
  const { clientId } = req.params;
  const { config } = req.body;

  try {
    const rules = ClientRulesEngine.configureClient(clientId, config);

    res.json({
      success: true,
      clientId,
      rules,
      message: 'Client rules configured successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /v1/industries/:industry/best-practices
app.get('/v1/industries/:industry/best-practices', [
  param('industry').isString()
], (req, res) => {
  const { industry } = req.params;

  try {
    const profile = IndustryProfiles.getProfile(industry);

    res.json({
      success: true,
      industry,
      profile,
      recommendations: generateIndustryRecommendations(profile)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /v1/clients/:clientId/policies
app.put('/v1/clients/:clientId/policies', [
  param('clientId').isString(),
  body('policies').isObject()
], (req, res) => {
  const { clientId } = req.params;
  const { policies } = req.body;

  // In production, save to database
  res.json({
    success: true,
    clientId,
    policies,
    message: 'Policies updated successfully'
  });
});

// Helper function
function generateIndustryRecommendations(profile) {
  return {
    critical_accounts: profile.criticalAccounts.map(a => a.name),
    monitoring_focus: profile.criticalAccounts
      .filter(a => a.monitoring === 'high')
      .map(a => a.name),
    kpi_targets: profile.kpis,
    special_considerations: profile.specialConsiderations || {}
  };
}

// Server
const PORT = process.env.PORT || 8002;
app.listen(PORT, () => {
  console.log(`Business Logic Service running on port ${PORT}`);
});

module.exports = {
  IndustryProfiles,
  ClientRulesEngine,
  BusinessContextClassifier,
  PolicyEngine
};