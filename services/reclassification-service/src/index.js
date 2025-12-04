// services/reclassification-service/src/index.js
const express = require('express');
const crypto = require('crypto');
const { body, param, validationResult } = require('express-validator');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    service: 'reclassification-service',
    status: 'active',
    version: '1.0.0'
  });
});

// ==========================================
// FOUR-EYES PRINCIPLE ENGINE
// ==========================================

class FourEyesPrinciple {
  static incompatibleRoles = {
    'PREPARER': ['APPROVER', 'REVIEWER'],
    'APPROVER': ['PREPARER'],
    'REVIEWER': ['PREPARER'],
    'PROCESSOR': ['APPROVER']
  };

  /**
   * Validate dual control - different individuals, segregation of duties
   */
  static async validateDualControl(action, userId, targetUserId) {
    const validations = [];

    // 1. Different individuals
    if (userId === targetUserId) {
      validations.push({
        passed: false,
        rule: 'different_users',
        message: 'Same user cannot prepare and approve'
      });
    } else {
      validations.push({
        passed: true,
        rule: 'different_users',
        message: 'Different users verified'
      });
    }

    // 2. Segregation of duties
    const sodCheck = await this.verifySegregationOfDuties(userId, targetUserId, action);
    validations.push(sodCheck);

    // 3. Independent review
    const independenceCheck = await this.verifyIndependentReview(userId, targetUserId);
    validations.push(independenceCheck);

    // 4. Coercion pattern detection
    const coercionCheck = await this.analyzeForCoercionPatterns(action);
    validations.push(coercionCheck);

    const allPassed = validations.every(v => v.passed);

    return {
      compliant: allPassed,
      validations,
      timestamp: new Date().toISOString()
    };
  }

  static async verifySegregationOfDuties(userId, targetUserId, action) {
    // Get roles for both users
    const userRoles = await this.getUserRoles(userId);
    const targetRoles = await this.getUserRoles(targetUserId);

    // Check for conflicting roles
    for (const role of userRoles) {
      const conflicts = this.incompatibleRoles[role] || [];
      const hasConflict = targetRoles.some(r => conflicts.includes(r));

      if (hasConflict) {
        return {
          passed: false,
          rule: 'segregation_of_duties',
          message: `SoD violation: User with ${role} cannot interact with user having ${conflicts.join(', ')}`
        };
      }
    }

    return {
      passed: true,
      rule: 'segregation_of_duties',
      message: 'No segregation of duties conflicts'
    };
  }

  static async verifyIndependentReview(userId, targetUserId) {
    // Check organizational independence
    const userDepartment = await this.getUserDepartment(userId);
    const targetDepartment = await this.getUserDepartment(targetUserId);

    // For high-risk transactions, require cross-department review
    const independent = userDepartment !== targetDepartment ||
      await this.hasIndependentReviewAuthority(targetUserId);

    return {
      passed: independent,
      rule: 'independent_review',
      message: independent ? 'Independent review verified' : 'Lacks independent review authority'
    };
  }

  static async analyzeForCoercionPatterns(action) {
    // Detect unusual patterns that might indicate coercion
    const patterns = [
      await this.checkUnusualTiming(action),
      await this.checkRapidSequence(action),
      await this.checkAfterHoursActivity(action)
    ];

    const suspiciousPatterns = patterns.filter(p => p.suspicious);

    return {
      passed: suspiciousPatterns.length === 0,
      rule: 'coercion_detection',
      message: suspiciousPatterns.length > 0
        ? `Suspicious patterns detected: ${suspiciousPatterns.map(p => p.type).join(', ')}`
        : 'No coercion indicators detected',
      patterns: suspiciousPatterns
    };
  }

  // Mock implementations - in production, query actual user database
  static async getUserRoles(userId) {
    const mockRoles = {
      'user1': ['PREPARER'],
      'user2': ['APPROVER', 'MANAGER'],
      'user3': ['REVIEWER'],
      'user4': ['CFO', 'APPROVER']
    };
    return mockRoles[userId] || ['USER'];
  }

  static async getUserDepartment(userId) {
    return 'ACCOUNTING'; // Mock
  }

  static async hasIndependentReviewAuthority(userId) {
    return ['user2', 'user4'].includes(userId); // Mock
  }

  static async checkUnusualTiming(action) {
    const hour = new Date().getHours();
    const isAfterHours = hour < 7 || hour > 19;

    return {
      suspicious: isAfterHours && action.amount > 50000,
      type: 'after_hours_large_transaction',
      hour
    };
  }

  static async checkRapidSequence(action) {
    // Check if multiple approvals happening too quickly
    return { suspicious: false, type: 'rapid_sequence' };
  }

  static async checkAfterHoursActivity(action) {
    const day = new Date().getDay();
    const isWeekend = day === 0 || day === 6;

    return {
      suspicious: isWeekend && action.amount > 100000,
      type: 'weekend_large_transaction'
    };
  }
}

// ==========================================
// RECLASSIFICATION PROPOSAL ENGINE
// ==========================================

class ReclassificationProposalEngine {
  static proposals = new Map(); // In production, use database

  /**
   * Generate reclassification proposal with risk assessment
   */
  static async generateProposal(transaction, newClassification, reason, userId) {
    const proposalId = crypto.randomUUID();

    // Risk assessment
    const riskAssessment = await this.assessReclassificationRisk(
      transaction,
      newClassification
    );

    // Determine required approval levels
    const approvalRequirements = await this.determineApprovalRequirements(
      transaction,
      riskAssessment
    );

    const proposal = {
      id: proposalId,
      transactionId: transaction.id,
      originalClassification: {
        account: transaction.account,
        accountCode: transaction.accountCode
      },
      proposedClassification: {
        account: newClassification.account,
        accountCode: newClassification.accountCode
      },
      reason,
      proposedBy: userId,
      proposedAt: new Date().toISOString(),
      riskAssessment,
      approvalRequirements,
      status: 'PENDING_APPROVAL',
      approvals: [],
      rejections: [],
      version: 1,
      // Cryptographic hash for integrity
      proposalHash: this.calculateProposalHash({
        transactionId: transaction.id,
        newClassification,
        reason,
        userId
      })
    };

    this.proposals.set(proposalId, proposal);

    // Audit trail
    await this.auditProposal(proposal, 'CREATED');

    return proposal;
  }

  static async assessReclassificationRisk(transaction, newClassification) {
    const riskFactors = [];
    let riskScore = 0;

    // 1. Amount risk
    const amount = Math.abs(transaction.amount);
    if (amount > 100000) {
      riskScore += 30;
      riskFactors.push({ factor: 'high_amount', score: 30, threshold: 100000 });
    } else if (amount > 50000) {
      riskScore += 15;
      riskFactors.push({ factor: 'medium_amount', score: 15, threshold: 50000 });
    }

    // 2. Account type change risk (Asset <-> Expense is high risk)
    const originalType = this.getAccountType(transaction.accountCode);
    const newType = this.getAccountType(newClassification.accountCode);

    if (originalType !== newType) {
      riskScore += 25;
      riskFactors.push({
        factor: 'account_type_change',
        score: 25,
        from: originalType,
        to: newType
      });
    }

    // 3. Impact on financial statements
    if (this.impactsIncomeStatement(originalType, newType)) {
      riskScore += 20;
      riskFactors.push({
        factor: 'income_statement_impact',
        score: 20
      });
    }

    // 4. Timing risk (near period end)
    if (this.isNearPeriodEnd()) {
      riskScore += 15;
      riskFactors.push({
        factor: 'near_period_end',
        score: 15
      });
    }

    // 5. Historical pattern (first time reclassification)
    if (!transaction.hasHistoricalReclassifications) {
      riskScore += 10;
      riskFactors.push({
        factor: 'first_time_reclass',
        score: 10
      });
    }

    return {
      riskScore,
      riskLevel: this.getRiskLevel(riskScore),
      riskFactors,
      requiresEnhancedReview: riskScore > 50
    };
  }

  static async determineApprovalRequirements(transaction, riskAssessment) {
    const requirements = {
      minimumApprovers: 1,
      requiredLevels: ['MANAGER'],
      slaHours: 72,
      requiresCFO: false,
      requiresAuditCommittee: false
    };

    // Risk-based approval matrix
    if (riskAssessment.riskScore < 20) {
      requirements.minimumApprovers = 1;
      requirements.requiredLevels = ['MANAGER'];
      requirements.slaHours = 72;
    } else if (riskAssessment.riskScore < 50) {
      requirements.minimumApprovers = 2;
      requirements.requiredLevels = ['MANAGER', 'DIRECTOR'];
      requirements.slaHours = 48;
    } else if (riskAssessment.riskScore < 80) {
      requirements.minimumApprovers = 3;
      requirements.requiredLevels = ['MANAGER', 'DIRECTOR', 'CFO'];
      requirements.requiresCFO = true;
      requirements.slaHours = 24;
    } else {
      requirements.minimumApprovers = 4;
      requirements.requiredLevels = ['MANAGER', 'DIRECTOR', 'CFO', 'AUDIT_COMMITTEE'];
      requirements.requiresCFO = true;
      requirements.requiresAuditCommittee = true;
      requirements.slaHours = 12;
    }

    return requirements;
  }

  static getAccountType(accountCode) {
    const code = parseInt(accountCode);
    if (code >= 1000 && code < 2000) return 'ASSET';
    if (code >= 2000 && code < 3000) return 'LIABILITY';
    if (code >= 3000 && code < 4000) return 'EQUITY';
    if (code >= 4000 && code < 5000) return 'REVENUE';
    if (code >= 5000 && code < 6000) return 'COGS';
    if (code >= 6000) return 'EXPENSE';
    return 'UNKNOWN';
  }

  static impactsIncomeStatement(fromType, toType) {
    const incomeStatementTypes = ['REVENUE', 'COGS', 'EXPENSE'];
    return incomeStatementTypes.includes(fromType) ||
      incomeStatementTypes.includes(toType);
  }

  static isNearPeriodEnd() {
    const now = new Date();
    const dayOfMonth = now.getDate();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return dayOfMonth > lastDayOfMonth - 5; // Last 5 days of month
  }

  static getRiskLevel(score) {
    if (score < 20) return 'LOW';
    if (score < 50) return 'MEDIUM';
    if (score < 80) return 'HIGH';
    return 'CRITICAL';
  }

  static calculateProposalHash(proposal) {
    const data = JSON.stringify(proposal);
    return crypto.createHash('sha384').update(data).digest('hex');
  }

  static async auditProposal(proposal, action) {
    // In production, write to audit service
    console.log(`AUDIT: Proposal ${proposal.id} - ${action}`);
  }
}

// ==========================================
// APPROVAL WORKFLOW ENGINE
// ==========================================

class ApprovalWorkflowEngine {
  /**
   * Process approval with four-eyes validation
   */
  static async processApproval(proposalId, approverId, decision, comments) {
    const proposal = ReclassificationProposalEngine.proposals.get(proposalId);

    if (!proposal) {
      throw new Error(`Proposal ${proposalId} not found`);
    }

    if (proposal.status !== 'PENDING_APPROVAL') {
      throw new Error(`Proposal ${proposalId} is not in pending state`);
    }

    // Four-eyes principle validation
    const fourEyesCheck = await FourEyesPrinciple.validateDualControl(
      {
        proposalId,
        amount: proposal.riskAssessment.riskFactors.find(f => f.factor.includes('amount'))?.threshold || 0
      },
      proposal.proposedBy,
      approverId
    );

    if (!fourEyesCheck.compliant) {
      throw new Error(`Four-eyes principle violation: ${JSON.stringify(fourEyesCheck.validations)}`);
    }

    // Record approval/rejection
    const approvalRecord = {
      approverId,
      decision,
      comments,
      timestamp: new Date().toISOString(),
      fourEyesValidation: fourEyesCheck,
      ipAddress: '0.0.0.0', // In production, capture from request
      userAgent: 'API',
      cryptographicProof: this.generateApprovalProof(proposalId, approverId, decision)
    };

    if (decision === 'APPROVED') {
      proposal.approvals.push(approvalRecord);
    } else if (decision === 'REJECTED') {
      proposal.rejections.push(approvalRecord);
      proposal.status = 'REJECTED';
      return this.finalizeRejection(proposal);
    }

    // Check if all required approvals obtained
    const requirements = proposal.approvalRequirements;
    if (proposal.approvals.length >= requirements.minimumApprovers) {
      // Verify all required levels have approved
      const approverLevels = await this.getApproverLevels(proposal.approvals);
      const hasAllRequiredLevels = requirements.requiredLevels.every(level =>
        approverLevels.includes(level)
      );

      if (hasAllRequiredLevels) {
        proposal.status = 'APPROVED';
        return this.executeReclassification(proposal);
      }
    }

    // Still pending more approvals
    return {
      status: 'PENDING_MORE_APPROVALS',
      proposal,
      remainingApprovers: requirements.minimumApprovers - proposal.approvals.length,
      requiredLevels: requirements.requiredLevels
    };
  }

  static async executeReclassification(proposal) {
    // Generate journal entry
    const journalEntry = this.generateJournalEntry(proposal);

    // Create audit trail
    await this.createAuditTrail(proposal, journalEntry);

    // Update proposal
    proposal.status = 'EXECUTED';
    proposal.executedAt = new Date().toISOString();
    proposal.journalEntry = journalEntry;

    return {
      status: 'EXECUTED',
      proposal,
      journalEntry,
      message: 'Reclassification executed successfully'
    };
  }

  static generateJournalEntry(proposal) {
    const { transactionId, originalClassification, proposedClassification } = proposal;
    const amount = proposal.riskAssessment.riskFactors
      .find(f => f.factor.includes('amount'))?.threshold || 1000;

    return {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      description: `Reclassification: ${originalClassification.account} to ${proposedClassification.account}`,
      reference: `RECLASS-${proposalId}`,
      entries: [
        {
          account: proposedClassification.account,
          accountCode: proposedClassification.accountCode,
          debit: amount,
          credit: 0
        },
        {
          account: originalClassification.account,
          accountCode: originalClassification.accountCode,
          debit: 0,
          credit: amount
        }
      ],
      approvals: proposal.approvals,
      riskLevel: proposal.riskAssessment.riskLevel
    };
  }

  static async finalizeRejection(proposal) {
    await this.createAuditTrail(proposal, null);

    return {
      status: 'REJECTED',
      proposal,
      message: 'Reclassification proposal rejected'
    };
  }

  static generateApprovalProof(proposalId, approverId, decision) {
    const data = `${proposalId}:${approverId}:${decision}:${Date.now()}`;
    return crypto.createHash('sha384').update(data).digest('hex');
  }

  static async getApproverLevels(approvals) {
    // Mock - in production, query user roles
    return ['MANAGER', 'DIRECTOR'];
  }

  static async createAuditTrail(proposal, journalEntry) {
    console.log(`AUDIT: Reclassification ${proposal.id} - ${proposal.status}`);
  }
}

// ==========================================
// COMPENSATING CONTROLS ENGINE
// ==========================================

class CompensatingControlsEngine {
  /**
   * Handle emergency approvals when normal controls can't be applied
   */
  static async handleEmergencyApproval(request) {
    const emergencyRecord = {
      id: crypto.randomUUID(),
      requestId: request.id,
      timestamp: new Date().toISOString(),
      requestedBy: request.userId,
      reason: request.emergencyReason,
      compensatingControls: []
    };

    // 1. Enhanced documentation requirement
    const documentation = await this.captureEmergencyJustification(request);
    emergencyRecord.compensatingControls.push({
      control: 'enhanced_documentation',
      status: 'APPLIED',
      evidence: documentation
    });

    // 2. Additional approval layers
    const cfoApproval = await this.requireCFOApproval(request);
    emergencyRecord.compensatingControls.push({
      control: 'cfo_approval',
      status: cfoApproval.approved ? 'SATISFIED' : 'PENDING',
      approver: cfoApproval.approver
    });

    // 3. Post-transaction monitoring
    const monitoringSchedule = await this.schedulePostApprovalReview(request);
    emergencyRecord.compensatingControls.push({
      control: 'post_transaction_review',
      status: 'SCHEDULED',
      reviewDate: monitoringSchedule.reviewDate
    });

    // 4. Automatic regulatory reporting
    const regulatoryReport = await this.fileEmergencyActivityReport(request);
    emergencyRecord.compensatingControls.push({
      control: 'regulatory_reporting',
      status: 'FILED',
      reportId: regulatoryReport.id
    });

    return emergencyRecord;
  }

  static async captureEmergencyJustification(request) {
    return {
      reason: request.emergencyReason,
      businessImpact: request.businessImpact,
      alternativesConsidered: request.alternatives,
      riskMitigation: request.riskMitigation,
      timestamp: new Date().toISOString()
    };
  }

  static async requireCFOApproval(request) {
    return {
      approved: false,
      approver: 'CFO',
      pending: true
    };
  }

  static async schedulePostApprovalReview(request) {
    const reviewDate = new Date();
    reviewDate.setDate(reviewDate.getDate() + 7); // 7 days post-approval

    return {
      reviewDate: reviewDate.toISOString(),
      reviewer: 'INTERNAL_AUDIT',
      scope: 'full_transaction_review'
    };
  }

  static async fileEmergencyActivityReport(request) {
    return {
      id: crypto.randomUUID(),
      filedAt: new Date().toISOString(),
      reportType: 'EMERGENCY_APPROVAL',
      recipient: 'COMPLIANCE_OFFICER'
    };
  }
}

// ==========================================
// WORKFLOW QUEUE MANAGEMENT
// ==========================================

class WorkflowQueueManager {
  static async getUserWorkQueue(userId) {
    // Get proposals awaiting this user's approval
    const proposals = Array.from(ReclassificationProposalEngine.proposals.values())
      .filter(p => p.status === 'PENDING_APPROVAL');

    const userRoles = await FourEyesPrinciple.getUserRoles(userId);

    // Filter based on user's approval authority
    const workQueue = proposals.filter(p => {
      const requiredLevels = p.approvalRequirements.requiredLevels;
      return requiredLevels.some(level => userRoles.includes(level));
    });

    // Calculate SLA status for each item
    const enrichedQueue = workQueue.map(proposal => {
      const createdAt = new Date(proposal.proposedAt);
      const now = new Date();
      const hoursPending = (now - createdAt) / (1000 * 60 * 60);
      const slaHours = proposal.approvalRequirements.slaHours;

      return {
        ...proposal,
        slaStatus: {
          hoursPending: Math.round(hoursPending),
          slaHours,
          breached: hoursPending > slaHours,
          warning: hoursPending > (slaHours * 0.8),
          hoursRemaining: Math.max(0, slaHours - hoursPending)
        }
      };
    });

    // Sort by urgency (SLA breached first, then by risk level)
    return enrichedQueue.sort((a, b) => {
      if (a.slaStatus.breached && !b.slaStatus.breached) return -1;
      if (!a.slaStatus.breached && b.slaStatus.breached) return 1;

      const riskOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return riskOrder[b.riskAssessment.riskLevel] - riskOrder[a.riskAssessment.riskLevel];
    });
  }
}

// ==========================================
// API ENDPOINTS
// ==========================================

// POST /v1/reclass/proposals
app.post('/v1/reclass/proposals', [
  body('transaction').isObject(),
  body('newClassification').isObject(),
  body('reason').isString().isLength({ min: 10 }),
  body('userId').isString()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { transaction, newClassification, reason, userId } = req.body;

  try {
    const proposal = await ReclassificationProposalEngine.generateProposal(
      transaction,
      newClassification,
      reason,
      userId
    );

    res.json({
      success: true,
      proposal,
      message: 'Reclassification proposal created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /v1/reclass/proposals/:id/approve
app.put('/v1/reclass/proposals/:id/approve', [
  param('id').isUUID(),
  body('approverId').isString(),
  body('comments').optional().isString()
], async (req, res) => {
  const { id } = req.params;
  const { approverId, comments } = req.body;

  try {
    const result = await ApprovalWorkflowEngine.processApproval(
      id,
      approverId,
      'APPROVED',
      comments || ''
    );

    res.json({
      success: true,
      result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /v1/reclass/proposals/:id/reject
app.put('/v1/reclass/proposals/:id/reject', [
  param('id').isUUID(),
  body('approverId').isString(),
  body('comments').isString().isLength({ min: 10 })
], async (req, res) => {
  const { id } = req.params;
  const { approverId, comments } = req.body;

  try {
    const result = await ApprovalWorkflowEngine.processApproval(
      id,
      approverId,
      'REJECTED',
      comments
    );

    res.json({
      success: true,
      result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// GET /v1/reclass/workqueue/:userId
app.get('/v1/reclass/workqueue/:userId', [
  param('userId').isString()
], async (req, res) => {
  const { userId } = req.params;

  try {
    const workQueue = await WorkflowQueueManager.getUserWorkQueue(userId);

    res.json({
      success: true,
      workQueue,
      summary: {
        total: workQueue.length,
        sla_breached: workQueue.filter(w => w.slaStatus.breached).length,
        sla_warning: workQueue.filter(w => w.slaStatus.warning).length,
        critical: workQueue.filter(w => w.riskAssessment.riskLevel === 'CRITICAL').length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /v1/reclass/emergency-approval
app.post('/v1/reclass/emergency-approval', [
  body('request').isObject()
], async (req, res) => {
  const { request } = req.body;

  try {
    const emergencyRecord = await CompensatingControlsEngine.handleEmergencyApproval(request);

    res.json({
      success: true,
      emergencyRecord,
      message: 'Emergency approval processed with compensating controls'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Server
const PORT = process.env.PORT || 8007;
app.listen(PORT, () => {
  console.log(`Reclassification Service running on port ${PORT}`);
});

module.exports = {
  FourEyesPrinciple,
  ReclassificationProposalEngine,
  ApprovalWorkflowEngine,
  CompensatingControlsEngine,
  WorkflowQueueManager
};