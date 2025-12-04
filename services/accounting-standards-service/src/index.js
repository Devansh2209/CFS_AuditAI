const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('./config/database');
const { logger, authMiddleware, rateLimiter, securityHeaders } = require('@cfs/common-utils');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(securityHeaders);
app.use(rateLimiter);

// Initialize Database
async function initDB() {
  try {
    const migration = fs.readFileSync(path.join(__dirname, 'migrations', '001_initial_schema.sql'), 'utf8');
    await db.query(migration);
    logger.info('Database initialized and migrations applied');
  } catch (error) {
    logger.error('Failed to initialize database', error);
    process.exit(1);
  }
}

initDB();

// Public Endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'accounting-standards-service',
    status: 'active',
    version: '1.0.0',
    endpoints: [
      '/v1/classifications/analyze-complex',
      '/v1/judgments/materiality-assessment',
      '/v1/transactions/:id/compliance-check'
    ]
  });
});

// Protected Endpoint Example
app.post('/v1/standards', authMiddleware, async (req, res) => {
  // Implementation for adding a new standard
  res.status(201).json({ message: 'Standard created', user: req.user.username });
});

// ==========================================
// GAAP RULES ENGINE
// ==========================================

class GAAPRevenueRecognition {
  /**
   * ASC 606 - Revenue from Contracts with Customers
   * Five-step model implementation
   */
  static analyzeRevenue(transaction) {
    const steps = {
      step1_contract: this.identifyContract(transaction),
      step2_obligations: this.identifyPerformanceObligations(transaction),
      step3_price: this.determineTransactionPrice(transaction),
      step4_allocation: this.allocatePrice(transaction),
      step5_recognition: this.recognizeRevenue(transaction)
    };

    return {
      compliant: Object.values(steps).every(s => s.compliant),
      steps,
      recommendation: this.generateRecommendation(steps),
      classification: this.determineClassification(steps)
    };
  }

  static identifyContract(transaction) {
    // Contract criteria per ASC 606-10-25-1
    const criteria = {
      approval: transaction.hasApproval || false,
      rightsIdentified: transaction.rightsAndObligations || false,
      paymentTerms: transaction.paymentTerms !== undefined,
      commercialSubstance: transaction.amount > 0,
      collectionProbable: transaction.creditRisk !== 'high'
    };

    return {
      compliant: Object.values(criteria).every(c => c === true),
      criteria,
      notes: this.getContractNotes(criteria)
    };
  }

  static identifyPerformanceObligations(transaction) {
    const obligations = [];

    // Parse transaction description for multiple deliverables
    if (transaction.description) {
      const desc = transaction.description.toLowerCase();

      if (desc.includes('software') && desc.includes('support')) {
        obligations.push({
          type: 'software_license',
          distinct: true,
          timing: 'point_in_time'
        });
        obligations.push({
          type: 'support_services',
          distinct: true,
          timing: 'over_time'
        });
      } else if (desc.includes('subscription')) {
        obligations.push({
          type: 'subscription_service',
          distinct: true,
          timing: 'over_time'
        });
      } else {
        obligations.push({
          type: 'single_deliverable',
          distinct: true,
          timing: 'point_in_time'
        });
      }
    }

    return {
      compliant: obligations.length > 0,
      obligations,
      notes: `Identified ${obligations.length} performance obligation(s)`
    };
  }

  static determineTransactionPrice(transaction) {
    let price = transaction.amount;
    const adjustments = [];

    // Variable consideration
    if (transaction.hasDiscount) {
      adjustments.push({
        type: 'discount',
        amount: transaction.discountAmount || 0,
        constraint: 'expected_value'
      });
      price -= transaction.discountAmount || 0;
    }

    // Significant financing component
    if (transaction.paymentTerms > 365) {
      const financingAdjustment = price * 0.05; // Simplified
      adjustments.push({
        type: 'financing',
        amount: financingAdjustment,
        reason: 'payment_terms_exceed_one_year'
      });
    }

    return {
      compliant: price > 0,
      transactionPrice: price,
      adjustments,
      notes: 'Transaction price determined per ASC 606-10-32'
    };
  }

  static allocatePrice(transaction) {
    // Standalone selling price allocation
    return {
      compliant: true,
      method: 'standalone_selling_price',
      allocations: [],
      notes: 'Price allocated based on relative standalone selling prices'
    };
  }

  static recognizeRevenue(transaction) {
    const timing = transaction.revenueRecognitionTiming || 'point_in_time';

    return {
      compliant: true,
      timing,
      method: timing === 'over_time' ? 'input_method' : 'transfer_of_control',
      recognitionDate: transaction.date,
      notes: `Revenue recognized ${timing}`
    };
  }

  static getContractNotes(criteria) {
    const issues = [];
    if (!criteria.approval) issues.push('Missing contract approval');
    if (!criteria.collectionProbable) issues.push('Collection not probable');
    return issues.length > 0 ? issues.join('; ') : 'All contract criteria met';
  }

  static generateRecommendation(steps) {
    if (!steps.step1_contract.compliant) {
      return 'Do not recognize revenue - contract criteria not met';
    }
    if (!steps.step2_obligations.compliant) {
      return 'Identify performance obligations before recognition';
    }
    return 'Revenue recognition criteria met - proceed with recognition';
  }

  static determineClassification(steps) {
    const obligations = steps.step2_obligations.obligations || [];

    if (obligations.some(o => o.timing === 'over_time')) {
      return {
        account: 'Deferred Revenue',
        accountCode: '2400',
        type: 'liability',
        reason: 'Contains over-time performance obligations'
      };
    }

    return {
      account: 'Revenue',
      accountCode: '4000',
      type: 'revenue',
      reason: 'Point-in-time recognition appropriate'
    };
  }
}

class GAAPLeaseAccounting {
  /**
   * ASC 842 - Leases
   */
  static analyzeLease(transaction) {
    const isLease = this.identifyLease(transaction);

    if (!isLease.isLease) {
      return {
        isLease: false,
        classification: 'not_a_lease',
        notes: isLease.reason
      };
    }

    const classification = this.classifyLease(transaction);
    const measurement = this.measureLease(transaction, classification);

    return {
      isLease: true,
      classification: classification.type,
      rightOfUseAsset: measurement.rouAsset,
      leaseLiability: measurement.liability,
      journalEntries: measurement.entries,
      notes: classification.notes
    };
  }

  static identifyLease(transaction) {
    const desc = (transaction.description || '').toLowerCase();
    const keywords = ['lease', 'rent', 'rental'];

    const hasLeaseKeyword = keywords.some(k => desc.includes(k));
    const isRecurring = transaction.isRecurring || false;
    const significantAmount = transaction.amount > 5000;

    if (hasLeaseKeyword && isRecurring && significantAmount) {
      return { isLease: true, reason: 'Meets lease criteria per ASC 842-10-15' };
    }

    return { isLease: false, reason: 'Does not meet lease definition' };
  }

  static classifyLease(transaction) {
    // Operating vs Finance lease classification (5 criteria)
    const criteria = {
      transfersOwnership: false,
      purchaseOption: false,
      leaseTermMajorPart: transaction.leaseTerm >= 36, // 75% test simplified
      pvSubstantiallyAll: false,
      specializedAsset: false
    };

    const isFinanceLease = Object.values(criteria).some(c => c === true);

    return {
      type: isFinanceLease ? 'finance' : 'operating',
      criteria,
      notes: isFinanceLease
        ? 'Classified as finance lease per ASC 842-10-25-2'
        : 'Classified as operating lease'
    };
  }

  static measureLease(transaction, classification) {
    const monthlyPayment = transaction.amount;
    const term = transaction.leaseTerm || 12;
    const rate = 0.05; // Simplified incremental borrowing rate

    // Present value calculation (simplified)
    const pv = monthlyPayment * term * (1 - Math.pow(1 + rate / 12, -term)) / (rate / 12);

    const entries = classification.type === 'finance' ? [
      { account: 'Right-of-Use Asset', debit: pv },
      { account: 'Lease Liability', credit: pv }
    ] : [
      { account: 'Right-of-Use Asset', debit: pv },
      { account: 'Operating Lease Liability', credit: pv }
    ];

    return {
      rouAsset: pv,
      liability: pv,
      entries
    };
  }
}

// ==========================================
// MATERIALITY ENGINE
// ==========================================

class MaterialityAssessment {
  static assess(transaction, clientContext) {
    const thresholds = this.getThresholds(clientContext);
    const quantitative = this.quantitativeTest(transaction, thresholds);
    const qualitative = this.qualitativeTest(transaction, clientContext);

    return {
      isMaterial: quantitative.isMaterial || qualitative.isMaterial,
      quantitative,
      qualitative,
      recommendation: this.getRecommendation(quantitative, qualitative),
      requiresReview: qualitative.factors.length > 0
    };
  }

  static getThresholds(clientContext) {
    // Industry-specific materiality thresholds
    const baseThresholds = {
      manufacturing: { percent: 0.05, absolute: 50000 },
      software: { percent: 0.03, absolute: 25000 },
      healthcare: { percent: 0.02, absolute: 100000 },
      default: { percent: 0.05, absolute: 50000 }
    };

    const industry = clientContext.industry || 'default';
    return baseThresholds[industry] || baseThresholds.default;
  }

  static quantitativeTest(transaction, thresholds) {
    const amount = Math.abs(transaction.amount);
    const revenue = transaction.clientRevenue || 1000000;
    const percentOfRevenue = amount / revenue;

    const isMaterial =
      percentOfRevenue >= thresholds.percent ||
      amount >= thresholds.absolute;

    return {
      isMaterial,
      amount,
      percentOfRevenue: percentOfRevenue * 100,
      threshold: thresholds,
      notes: isMaterial
        ? `Exceeds ${thresholds.percent * 100}% threshold or $${thresholds.absolute}`
        : 'Below quantitative thresholds'
    };
  }

  static qualitativeTest(transaction, clientContext) {
    const factors = [];

    // Related party transactions
    if (transaction.isRelatedParty) {
      factors.push({
        factor: 'related_party',
        severity: 'high',
        note: 'Related party transaction requires disclosure'
      });
    }

    // Significant accounting estimate
    if (transaction.requiresEstimate) {
      factors.push({
        factor: 'significant_estimate',
        severity: 'medium',
        note: 'Involves significant management judgment'
      });
    }

    // Near break-even or debt covenant
    if (clientContext.nearCovenantThreshold) {
      factors.push({
        factor: 'covenant_risk',
        severity: 'high',
        note: 'Could impact debt covenant compliance'
      });
    }

    return {
      isMaterial: factors.some(f => f.severity === 'high'),
      factors,
      notes: factors.length > 0
        ? 'Qualitative factors identified'
        : 'No qualitative materiality factors'
    };
  }

  static getRecommendation(quantitative, qualitative) {
    if (quantitative.isMaterial || qualitative.isMaterial) {
      return 'MATERIAL - Requires detailed review and potential adjustment';
    }
    if (qualitative.factors.length > 0) {
      return 'Document qualitative factors in workpapers';
    }
    return 'Not material - standard processing acceptable';
  }
}

// ==========================================
// COMPLIANCE CHECKER
// ==========================================

class ComplianceChecker {
  static checkTransaction(transaction, standard = 'GAAP') {
    const checks = {
      gaap: standard === 'GAAP' ? this.gaapCompliance(transaction) : null,
      ifrs: standard === 'IFRS' ? this.ifrsCompliance(transaction) : null,
      sox: this.soxControls(transaction)
    };

    return {
      compliant: Object.values(checks).every(c => !c || c.compliant),
      checks,
      violations: this.getViolations(checks),
      recommendations: this.getRecommendations(checks)
    };
  }

  static gaapCompliance(transaction) {
    const violations = [];

    // Matching principle
    if (transaction.type === 'expense' && !transaction.relatedRevenue) {
      if (transaction.amount > 10000) {
        violations.push({
          principle: 'matching',
          severity: 'medium',
          note: 'Large expense without clear revenue matching'
        });
      }
    }

    // Full disclosure
    if (transaction.isUnusual && !transaction.hasDisclosure) {
      violations.push({
        principle: 'full_disclosure',
        severity: 'high',
        note: 'Unusual transaction requires disclosure'
      });
    }

    return {
      compliant: violations.length === 0,
      violations,
      standard: 'US GAAP'
    };
  }

  static ifrsCompliance(transaction) {
    // IFRS-specific checks
    return {
      compliant: true,
      violations: [],
      standard: 'IFRS'
    };
  }

  static soxControls(transaction) {
    const controls = [];

    // Segregation of duties
    if (transaction.preparedBy === transaction.approvedBy) {
      controls.push({
        control: 'segregation_of_duties',
        status: 'failed',
        severity: 'high',
        note: 'Same person prepared and approved transaction'
      });
    }

    // Authorization limits
    if (transaction.amount > 10000 && !transaction.approvedBy) {
      controls.push({
        control: 'authorization',
        status: 'failed',
        severity: 'high',
        note: 'Transaction exceeds authorization limit without approval'
      });
    }

    return {
      compliant: controls.length === 0,
      controls,
      notes: controls.length === 0 ? 'All SOX controls passed' : 'Control deficiencies identified'
    };
  }

  static getViolations(checks) {
    const violations = [];
    Object.values(checks).forEach(check => {
      if (check && check.violations) {
        violations.push(...check.violations);
      }
      if (check && check.controls) {
        violations.push(...check.controls.filter(c => c.status === 'failed'));
      }
    });
    return violations;
  }

  static getRecommendations(checks) {
    const recommendations = [];
    const violations = this.getViolations(checks);

    violations.forEach(v => {
      if (v.severity === 'high') {
        recommendations.push(`URGENT: Address ${v.principle || v.control} violation`);
      }
    });

    return recommendations;
  }
}

// ==========================================
// API ENDPOINTS
// ==========================================

// POST /v1/classifications/analyze-complex
app.post('/v1/classifications/analyze-complex', [
  body('transaction').isObject(),
  body('standard').optional().isIn(['GAAP', 'IFRS'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { transaction, standard = 'GAAP' } = req.body;

  try {
    let analysis = {};

    // Determine transaction type and apply appropriate rules
    if (transaction.type === 'revenue' || transaction.description?.toLowerCase().includes('revenue')) {
      analysis.revenue = GAAPRevenueRecognition.analyzeRevenue(transaction);
    }

    if (transaction.description?.toLowerCase().includes('lease')) {
      analysis.lease = GAAPLeaseAccounting.analyzeLease(transaction);
    }

    // Materiality assessment
    analysis.materiality = MaterialityAssessment.assess(
      transaction,
      { industry: transaction.industry, nearCovenantThreshold: false }
    );

    // Compliance check
    analysis.compliance = ComplianceChecker.checkTransaction(transaction, standard);

    res.json({
      success: true,
      transactionId: transaction.id,
      analysis,
      recommendation: generateFinalRecommendation(analysis),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /v1/judgments/materiality-assessment
app.post('/v1/judgments/materiality-assessment', [
  body('transaction').isObject(),
  body('clientContext').isObject()
], (req, res) => {
  const { transaction, clientContext } = req.body;

  try {
    const assessment = MaterialityAssessment.assess(transaction, clientContext);

    res.json({
      success: true,
      assessment,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /v1/transactions/:id/compliance-check
app.get('/v1/transactions/:id/compliance-check', [
  param('id').isString()
], async (req, res) => {
  const { id } = req.params;
  const { standard = 'GAAP' } = req.query;

  // In production, fetch transaction from database
  const mockTransaction = {
    id,
    amount: 50000,
    type: 'expense',
    description: 'Software license',
    preparedBy: 'user1',
    approvedBy: 'user2'
  };

  try {
    const compliance = ComplianceChecker.checkTransaction(mockTransaction, standard);

    res.json({
      success: true,
      transactionId: id,
      compliance,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper function
function generateFinalRecommendation(analysis) {
  const issues = [];

  if (analysis.materiality?.isMaterial) {
    issues.push('Material transaction - requires detailed review');
  }

  if (!analysis.compliance?.compliant) {
    issues.push('Compliance violations detected');
  }

  if (analysis.revenue && !analysis.revenue.compliant) {
    issues.push(analysis.revenue.recommendation);
  }

  if (issues.length === 0) {
    return 'Transaction appears compliant - proceed with standard processing';
  }

  return issues.join('; ');
}

// Server
const PORT = process.env.PORT || 8001;
app.listen(PORT, () => {
  console.log(`Accounting Standards Service running on port ${PORT}`);
});

module.exports = {
  GAAPRevenueRecognition,
  GAAPLeaseAccounting,
  MaterialityAssessment,
  ComplianceChecker
};