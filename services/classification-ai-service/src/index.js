// services/classification-ai-service/src/index.js
const express = require('express');
const { body, param, validationResult } = require('express-validator');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    service: 'classification-ai-service',
    status: 'active',
    version: '1.0.0',
    endpoints: [
      '/v1/classify/transactions',
      '/v1/feedback/incorporate',
      '/v1/confidence/calibration',
      '/v1/models/:modelId/retrain'
    ]
  });
});

// ==========================================
// ML MODEL MANAGER
// ==========================================

class MLModelManager {
  static models = new Map();

  static initializeModels() {
    // In production, load actual ML models
    this.models.set('transaction_classifier_v1', {
      version: '1.0.0',
      type: 'classification',
      features: ['amount', 'description_embedding', 'vendor', 'category'],
      accuracy: 0.89,
      lastTrainedDate: '2024-01-15',
      trainingDataSize: 150000
    });

    this.models.set('confidence_scorer_v1', {
      version: '1.0.0',
      type: 'confidence_scoring',
      features: ['model_probability', 'description_quality', 'historical_matches'],
      calibrated: true
    });
  }

  static getModel(modelId) {
    return this.models.get(modelId);
  }

  static async predict(modelId, features) {
    // Simulate ML prediction
    // In production, call actual ML model (TensorFlow, PyTorch, etc.)

    if (modelId === 'transaction_classifier_v1') {
      return this.simulateClassification(features);
    }

    if (modelId === 'confidence_scorer_v1') {
      return this.simulateConfidenceScore(features);
    }

    throw new Error(`Model ${modelId} not found`);
  }

  static simulateClassification(features) {
    // Simplified classification simulation
    const { description, amount, vendor } = features;

    // Rule-based simulation (in production, use actual ML model)
    const predictions = [];

    if (description) {
      const desc = description.toLowerCase();

      if (desc.includes('office supplies') || desc.includes('staples')) {
        predictions.push({ account: 'Office Supplies', code: '6300', probability: 0.92 });
      } else if (desc.includes('travel') || desc.includes('hotel') || desc.includes('flight')) {
        predictions.push({ account: 'Travel Expense', code: '6400', probability: 0.88 });
      } else if (desc.includes('software') || desc.includes('saas') || desc.includes('subscription')) {
        predictions.push({ account: 'Software & Subscriptions', code: '6350', probability: 0.85 });
      } else if (desc.includes('rent') || desc.includes('lease')) {
        predictions.push({ account: 'Rent Expense', code: '6200', probability: 0.90 });
      } else if (desc.includes('payroll') || desc.includes('salary') || desc.includes('wages')) {
        predictions.push({ account: 'Salaries & Wages', code: '6000', probability: 0.94 });
      } else if (desc.includes('utilities') || desc.includes('electric') || desc.includes('internet')) {
        predictions.push({ account: 'Utilities', code: '6250', probability: 0.87 });
      } else if (desc.includes('marketing') || desc.includes('advertising')) {
        predictions.push({ account: 'Marketing & Advertising', code: '6500', probability: 0.86 });
      } else {
        predictions.push({ account: 'General Expense', code: '6999', probability: 0.65 });
      }
    }

    // Sort by probability
    predictions.sort((a, b) => b.probability - a.probability);

    return {
      predictions: predictions.slice(0, 3), // Top 3
      model: 'transaction_classifier_v1',
      inferenceTime: Math.random() * 50 + 10 // ms
    };
  }

  static simulateConfidenceScore(features) {
    const { model_probability, description_quality, historical_matches } = features;

    // Weighted confidence calculation
    let confidence = model_probability * 0.6;

    if (description_quality === 'high') confidence += 0.2;
    else if (description_quality === 'medium') confidence += 0.1;

    if (historical_matches > 5) confidence += 0.15;
    else if (historical_matches > 2) confidence += 0.08;

    // Calibration adjustment
    confidence = Math.min(confidence * 0.95, 0.99); // Don't claim 100% confidence

    return {
      confidence: Math.round(confidence * 100) / 100,
      factors: {
        model_probability,
        description_quality,
        historical_matches
      }
    };
  }
}

// ==========================================
// RULE-BASED CLASSIFICATION ENGINE
// ==========================================

class RuleEngine {
  static rules = [
    {
      id: 'rent_lease',
      pattern: /\b(rent|lease|rental)\b/i,
      account: 'Rent Expense',
      code: '6200',
      confidence: 0.90,
      priority: 1
    },
    {
      id: 'utilities',
      pattern: /\b(electric|gas|water|utilities|internet|phone)\b/i,
      account: 'Utilities',
      code: '6250',
      confidence: 0.87,
      priority: 1
    },
    {
      id: 'payroll',
      pattern: /\b(payroll|salary|wages|compensation)\b/i,
      account: 'Salaries & Wages',
      code: '6000',
      confidence: 0.93,
      priority: 1
    },
    {
      id: 'travel',
      pattern: /\b(travel|hotel|airfare|flight|uber|taxi)\b/i,
      account: 'Travel Expense',
      code: '6400',
      confidence: 0.88,
      priority: 2
    },
    {
      id: 'office_supplies',
      pattern: /\b(office supplies|staples|paper|pens)\b/i,
      account: 'Office Supplies',
      code: '6300',
      confidence: 0.85,
      priority: 2
    },
    {
      id: 'software',
      pattern: /\b(software|saas|subscription|license)\b/i,
      account: 'Software & Subscriptions',
      code: '6350',
      confidence: 0.82,
      priority: 2
    },
    {
      id: 'marketing',
      pattern: /\b(marketing|advertising|ad spend|promotion)\b/i,
      account: 'Marketing & Advertising',
      code: '6500',
      confidence: 0.84,
      priority: 2
    },
    {
      id: 'insurance',
      pattern: /\b(insurance|coverage|policy premium)\b/i,
      account: 'Insurance Expense',
      code: '6280',
      confidence: 0.89,
      priority: 1
    },
    {
      id: 'consulting',
      pattern: /\b(consulting|contractor|professional services)\b/i,
      account: 'Professional Services',
      code: '6600',
      confidence: 0.81,
      priority: 2
    }
  ];

  static classify(description) {
    if (!description) return null;

    const matchedRules = this.rules
      .filter(rule => rule.pattern.test(description))
      .sort((a, b) => b.priority - a.priority || b.confidence - a.confidence);

    if (matchedRules.length > 0) {
      const topRule = matchedRules[0];
      return {
        account: topRule.account,
        code: topRule.code,
        confidence: topRule.confidence,
        ruleId: topRule.id,
        source: 'rule_engine'
      };
    }

    return null;
  }

  static getAllMatches(description) {
    return this.rules
      .filter(rule => rule.pattern.test(description))
      .map(rule => ({
        account: rule.account,
        code: rule.code,
        confidence: rule.confidence,
        ruleId: rule.id
      }));
  }
}

// ==========================================
// ENSEMBLE CLASSIFIER
// ==========================================

class EnsembleClassifier {
  /**
   * Combines ML model predictions with rule-based classification
   * for improved accuracy and confidence
   */
  static async classify(transaction) {
    const results = {
      ml_prediction: null,
      rule_prediction: null,
      ensemble_prediction: null,
      metadata: {}
    };

    // Get ML model prediction
    try {
      const mlResult = await MLModelManager.predict('transaction_classifier_v1', {
        description: transaction.description,
        amount: transaction.amount,
        vendor: transaction.vendor
      });
      results.ml_prediction = mlResult.predictions[0];
      results.metadata.ml_inference_time = mlResult.inferenceTime;
    } catch (error) {
      console.error('ML prediction failed:', error);
    }

    // Get rule-based prediction
    try {
      const ruleResult = RuleEngine.classify(transaction.description);
      results.rule_prediction = ruleResult;
    } catch (error) {
      console.error('Rule classification failed:', error);
    }

    // Ensemble logic: combine predictions
    results.ensemble_prediction = this.combineResults(
      results.ml_prediction,
      results.rule_prediction,
      transaction
    );

    return results;
  }

  static combineResults(mlPred, rulePred, transaction) {
    // If both agree, high confidence
    if (mlPred && rulePred && mlPred.code === rulePred.code) {
      return {
        account: mlPred.account,
        code: mlPred.code,
        confidence: Math.min((mlPred.probability + rulePred.confidence) / 2 + 0.1, 0.98),
        method: 'ensemble_agreement',
        notes: 'ML and rule-based models agree'
      };
    }

    // If only rule matches, use rule with adjusted confidence
    if (rulePred && !mlPred) {
      return {
        account: rulePred.account,
        code: rulePred.code,
        confidence: rulePred.confidence * 0.9,
        method: 'rule_only',
        notes: 'Classification based on business rules'
      };
    }

    // If only ML matches, use ML
    if (mlPred && !rulePred) {
      return {
        account: mlPred.account,
        code: mlPred.code,
        confidence: mlPred.probability * 0.85,
        method: 'ml_only',
        notes: 'Classification based on ML model'
      };
    }

    // If both exist but disagree, use higher confidence
    if (mlPred && rulePred) {
      const useML = mlPred.probability > rulePred.confidence;
      return {
        account: useML ? mlPred.account : rulePred.account,
        code: useML ? mlPred.code : rulePred.code,
        confidence: (useML ? mlPred.probability : rulePred.confidence) * 0.75,
        method: 'ensemble_disagreement',
        notes: 'Models disagree - using higher confidence prediction',
        alternative: useML ? rulePred : mlPred
      };
    }

    // Fallback - no classification
    return {
      account: 'Unclassified',
      code: '9999',
      confidence: 0.0,
      method: 'fallback',
      notes: 'Unable to classify - requires manual review'
    };
  }
}

// ==========================================
// CONFIDENCE CALIBRATION
// ==========================================

class ConfidenceCalibrator {
  static calibrationData = {
    // Historical accuracy by confidence bucket
    buckets: [
      { range: [0.9, 1.0], actual_accuracy: 0.94, sample_size: 5200 },
      { range: [0.8, 0.9], actual_accuracy: 0.86, sample_size: 8100 },
      { range: [0.7, 0.8], actual_accuracy: 0.75, sample_size: 6300 },
      { range: [0.6, 0.7], actual_accuracy: 0.65, sample_size: 4200 },
      { range: [0.0, 0.6], actual_accuracy: 0.48, sample_size: 3100 }
    ]
  };

  static calibrateConfidence(prediction) {
    const confidence = prediction.confidence;

    // Find matching bucket
    const bucket = this.calibrationData.buckets.find(
      b => confidence >= b.range[0] && confidence <= b.range[1]
    );

    if (bucket) {
      return {
        raw_confidence: confidence,
        calibrated_confidence: bucket.actual_accuracy,
        confidence_bucket: bucket.range,
        expected_accuracy: bucket.actual_accuracy,
        sample_size: bucket.sample_size,
        reliable: bucket.sample_size > 1000
      };
    }

    return {
      raw_confidence: confidence,
      calibrated_confidence: confidence,
      note: 'No calibration data available'
    };
  }

  static recommendAction(calibratedConfidence) {
    if (calibratedConfidence >= 0.90) {
      return {
        action: 'auto_classify',
        review_required: false,
        notes: 'High confidence - safe for automatic processing'
      };
    } else if (calibratedConfidence >= 0.75) {
      return {
        action: 'auto_classify_with_review',
        review_required: false,
        review_recommended: true,
        notes: 'Medium-high confidence - automatic with periodic sampling'
      };
    } else if (calibratedConfidence >= 0.60) {
      return {
        action: 'suggest_with_review',
        review_required: true,
        notes: 'Medium confidence - requires human review'
      };
    } else {
      return {
        action: 'manual_classification',
        review_required: true,
        notes: 'Low confidence - manual classification recommended'
      };
    }
  }
}

// ==========================================
// FEEDBACK LEARNING
// ==========================================

class FeedbackProcessor {
  static feedbackQueue = [];
  static retrainingThreshold = 100; // Retrain after 100 corrections

  static incorporateFeedback(transactionId, classification, correction) {
    const feedback = {
      transactionId,
      timestamp: new Date().toISOString(),
      predicted: classification,
      corrected: correction,
      features: classification.features
    };

    this.feedbackQueue.push(feedback);

    // Update immediate corrections (in-memory rule learning)
    this.updateRules(feedback);

    // Check if retraining threshold reached
    if (this.feedbackQueue.length >= this.retrainingThreshold) {
      return {
        status: 'retraining_triggered',
        queue_size: this.feedbackQueue.length,
        message: 'Model retraining recommended'
      };
    }

    return {
      status: 'feedback_recorded',
      queue_size: this.feedbackQueue.length,
      next_training: this.retrainingThreshold - this.feedbackQueue.length
    };
  }

  static updateRules(feedback) {
    // Learn from corrections to improve rule-based classification
    // In production, this would update a dynamic rule database

    if (feedback.corrected.account !== feedback.predicted.account) {
      console.log(`Learning: ${feedback.transactionId} should be ${feedback.corrected.account}`);
      // Could add dynamic rules here
    }
  }

  static getFeedbackStats() {
    const total = this.feedbackQueue.length;
    const corrections = this.feedbackQueue.filter(
      f => f.predicted.code !== f.corrected.code
    ).length;

    return {
      total_feedback: total,
      corrections: corrections,
      agreement_rate: total > 0 ? ((total - corrections) / total) : 0,
      queue_size: total,
      retraining_threshold: this.retrainingThreshold
    };
  }
}

// ==========================================
// API ENDPOINTS
// ==========================================

// Initialize models on startup
MLModelManager.initializeModels();

// POST /v1/classify/transactions
app.post('/v1/classify/transactions', [
  body('transactions').isArray(),
  body('transactions.*.id').isString(),
  body('transactions.*.description').optional().isString(),
  body('transactions.*.amount').isNumeric()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { transactions } = req.body;

  try {
    const results = await Promise.all(
      transactions.map(async (transaction) => {
        const classification = await EnsembleClassifier.classify(transaction);
        const calibration = ConfidenceCalibrator.calibrateConfidence(
          classification.ensemble_prediction
        );
        const recommendation = ConfidenceCalibrator.recommendAction(
          calibration.calibrated_confidence
        );

        return {
          transactionId: transaction.id,
          classification: classification.ensemble_prediction,
          calibration,
          recommendation,
          alternatives: classification.ml_prediction ?
            [classification.ml_prediction, classification.rule_prediction] : [],
          processing_time: classification.metadata.ml_inference_time
        };
      })
    );

    res.json({
      success: true,
      results,
      summary: {
        total: transactions.length,
        high_confidence: results.filter(r => r.calibration.calibrated_confidence >= 0.90).length,
        requires_review: results.filter(r => r.recommendation.review_required).length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /v1/feedback/incorporate
app.post('/v1/feedback/incorporate', [
  body('transactionId').isString(),
  body('classification').isObject(),
  body('correction').isObject()
], (req, res) => {
  const { transactionId, classification, correction } = req.body;

  try {
    const result = FeedbackProcessor.incorporateFeedback(
      transactionId,
      classification,
      correction
    );

    res.json({
      success: true,
      feedback: result,
      stats: FeedbackProcessor.getFeedbackStats()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /v1/confidence/calibration
app.get('/v1/confidence/calibration', (req, res) => {
  res.json({
    success: true,
    calibration_data: ConfidenceCalibrator.calibrationData,
    feedback_stats: FeedbackProcessor.getFeedbackStats()
  });
});

// POST /v1/models/:modelId/retrain
app.post('/v1/models/:modelId/retrain', [
  param('modelId').isString()
], async (req, res) => {
  const { modelId } = req.params;

  try {
    const model = MLModelManager.getModel(modelId);

    if (!model) {
      return res.status(404).json({
        success: false,
        error: 'Model not found'
      });
    }

    // In production, trigger actual model retraining
    const feedbackStats = FeedbackProcessor.getFeedbackStats();

    res.json({
      success: true,
      message: 'Retraining initiated',
      model: modelId,
      training_data: {
        existing: model.trainingDataSize,
        new_feedback: feedbackStats.total_feedback,
        corrections: feedbackStats.corrections
      },
      estimated_completion: '30 minutes'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Server
const PORT = process.env.PORT || 8005;
app.listen(PORT, () => {
  console.log(`Classification AI Service running on port ${PORT}`);
});

module.exports = {
  MLModelManager,
  RuleEngine,
  EnsembleClassifier,
  ConfidenceCalibrator,
  FeedbackProcessor
};