// services/nlp-processing-service/src/index.js
const express = require('express');
const { body, validationResult } = require('express-validator');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    service: 'nlp-processing-service',
    status: 'active',
    version: '1.0.0'
  });
});

// ==========================================
// DESCRIPTION PARSER
// ==========================================

class DescriptionParser {
  /**
   * Parse transaction descriptions to extract meaningful components
   */
  static parse(description) {
    if (!description) {
      return {
        original: '',
        cleaned: '',
        tokens: [],
        quality: 'none'
      };
    }

    const cleaned = this.cleanDescription(description);
    const tokens = this.tokenize(cleaned);
    const entities = this.extractBasicEntities(tokens, description);
    const quality = this.assessQuality(tokens);

    return {
      original: description,
      cleaned,
      tokens,
      entities,
      quality,
      word_count: tokens.length,
      has_vendor: entities.vendor !== null,
      has_amount_reference: /\$[\d,]+/.test(description)
    };
  }

  static cleanDescription(text) {
    return text
      .trim()
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/[^\w\s\-\.,$]/g, '') // Remove special chars except common ones
      .toLowerCase();
  }

  static tokenize(text) {
    // Simple tokenization - in production, use proper NLP library
    return text
      .split(/\s+/)
      .filter(token => token.length > 0)
      .filter(token => !this.isStopWord(token));
  }

  static isStopWord(word) {
    const stopWords = new Set([
      'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were'
    ]);
    return stopWords.has(word.toLowerCase());
  }

  static extractBasicEntities(tokens, originalText) {
    const entities = {
      vendor: null,
      product: null,
      location: null,
      date_reference: null
    };

    // Vendor detection (common vendors)
    const vendors = [
      'amazon', 'walmart', 'target', 'microsoft', 'google', 'salesforce',
      'adobe', 'slack', 'zoom', 'atlassian', 'aws', 'azure', 'fedex', 'ups',
      'staples', 'office depot', 'costco', 'starbucks', 'uber', 'lyft'
    ];

    for (const vendor of vendors) {
      if (originalText.toLowerCase().includes(vendor)) {
        entities.vendor = vendor.charAt(0).toUpperCase() + vendor.slice(1);
        break;
      }
    }

    // Product categories
    const productKeywords = {
      'software': ['software', 'saas', 'subscription', 'license'],
      'hardware': ['computer', 'laptop', 'monitor', 'printer'],
      'office_supplies': ['paper', 'pens', 'supplies', 'staples'],
      'travel': ['flight', 'hotel', 'airfare', 'rental car'],
      'food': ['lunch', 'dinner', 'catering', 'restaurant']
    };

    for (const [category, keywords] of Object.entries(productKeywords)) {
      if (keywords.some(kw => originalText.toLowerCase().includes(kw))) {
        entities.product = category;
        break;
      }
    }

    return entities;
  }

  static assessQuality(tokens) {
    if (tokens.length === 0) return 'none';
    if (tokens.length === 1) return 'poor';
    if (tokens.length <= 3) return 'low';
    if (tokens.length <= 6) return 'medium';
    if (tokens.length <= 10) return 'good';
    return 'high';
  }
}

// ==========================================
// ENTITY EXTRACTOR
// ==========================================

class EntityExtractor {
  /**
   * Extract named entities from transaction descriptions
   */
  static extract(description) {
    const entities = {
      companies: this.extractCompanies(description),
      products: this.extractProducts(description),
      amounts: this.extractAmounts(description),
      dates: this.extractDates(description),
      locations: this.extractLocations(description)
    };

    return {
      entities,
      entity_count: Object.values(entities).flat().length,
      has_entities: Object.values(entities).some(arr => arr.length > 0)
    };
  }

  static extractCompanies(text) {
    const companies = [];

    // Common company patterns
    const patterns = [
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(Inc|LLC|Corp|Corporation|Ltd|Co)\b/g,
      /\b(Microsoft|Google|Amazon|Apple|Facebook|Meta|Oracle|IBM|SAP)\b/gi
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        companies.push({
          name: match[0],
          type: 'company',
          confidence: 0.85
        });
      }
    });

    return companies;
  }

  static extractProducts(text) {
    const products = [];
    const productPatterns = [
      { pattern: /office 365|o365|microsoft 365/gi, name: 'Microsoft 365', category: 'software' },
      { pattern: /salesforce|sfdc/gi, name: 'Salesforce', category: 'software' },
      { pattern: /aws|amazon web services/gi, name: 'AWS', category: 'cloud' },
      { pattern: /google workspace|g suite/gi, name: 'Google Workspace', category: 'software' },
      { pattern: /adobe creative cloud/gi, name: 'Adobe Creative Cloud', category: 'software' }
    ];

    productPatterns.forEach(({ pattern, name, category }) => {
      if (pattern.test(text)) {
        products.push({
          name,
          category,
          confidence: 0.90
        });
      }
    });

    return products;
  }

  static extractAmounts(text) {
    const amounts = [];
    const amountPattern = /\$[\d,]+(?:\.\d{2})?/g;

    let match;
    while ((match = amountPattern.exec(text)) !== null) {
      amounts.push({
        text: match[0],
        value: parseFloat(match[0].replace(/[$,]/g, '')),
        position: match.index
      });
    }

    return amounts;
  }

  static extractDates(text) {
    const dates = [];

    // Simple date patterns
    const patterns = [
      /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/g,  // MM/DD/YYYY
      /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi,
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        dates.push({
          text: match[0],
          type: 'date',
          position: match.index
        });
      }
    });

    return dates;
  }

  static extractLocations(text) {
    const locations = [];

    // Common city patterns (simplified)
    const cities = [
      'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
      'San Francisco', 'Seattle', 'Boston', 'Atlanta', 'Miami'
    ];

    cities.forEach(city => {
      const regex = new RegExp(`\\b${city}\\b`, 'gi');
      if (regex.test(text)) {
        locations.push({
          name: city,
          type: 'city',
          confidence: 0.80
        });
      }
    });

    return locations;
  }
}

// ==========================================
// EXPLANATION GENERATOR
// ==========================================

class ExplanationGenerator {
  /**
   * Generate human-readable explanations for classifications
   */
  static generate(transaction, classification, context = {}) {
    const parts = [];

    // Transaction overview
    parts.push(this.generateOverview(transaction));

    // Classification reasoning
    parts.push(this.generateClassificationReason(classification, transaction));

    // Confidence explanation
    parts.push(this.generateConfidenceReason(classification));

    // Additional context
    if (context.similar_transactions) {
      parts.push(this.generateHistoricalContext(context.similar_transactions));
    }

    return {
      short: parts[0],
      detailed: parts.join('\n\n'),
      sections: {
        overview: parts[0],
        reasoning: parts[1],
        confidence: parts[2],
        historical: parts[3]
      }
    };
  }

  static generateOverview(transaction) {
    const amount = this.formatCurrency(transaction.amount);
    const vendor = transaction.vendor || 'Unknown vendor';
    const date = transaction.date || 'Unknown date';

    return `Transaction of ${amount} from ${vendor} on ${date}.`;
  }

  static generateClassificationReason(classification, transaction) {
    const reasons = [];

    if (classification.source === 'rule_engine') {
      reasons.push(`Classified as "${classification.account}" based on keyword matching in the description.`);
    } else if (classification.source === 'ml_model') {
      reasons.push(`Machine learning model classified this as "${classification.account}" based on historical patterns.`);
    } else if (classification.method === 'ensemble_agreement') {
      reasons.push(`Both AI model and business rules agree this should be classified as "${classification.account}".`);
    }

    // Add specific indicators
    if (transaction.description) {
      const keywords = this.extractKeywords(transaction.description, classification);
      if (keywords.length > 0) {
        reasons.push(`Key indicators: ${keywords.join(', ')}.`);
      }
    }

    return reasons.join(' ');
  }

  static generateConfidenceReason(classification) {
    const confidence = Math.round(classification.confidence * 100);

    if (confidence >= 90) {
      return `High confidence (${confidence}%) - This classification is highly reliable based on strong pattern matching and historical accuracy.`;
    } else if (confidence >= 75) {
      return `Good confidence (${confidence}%) - This classification is reliable but may benefit from periodic review.`;
    } else if (confidence >= 60) {
      return `Medium confidence (${confidence}%) - This classification has some uncertainty. Human review recommended.`;
    } else {
      return `Low confidence (${confidence}%) - This classification is uncertain. Manual review required to ensure accuracy.`;
    }
  }

  static generateHistoricalContext(similar_transactions) {
    if (!similar_transactions || similar_transactions.length === 0) {
      return 'No similar historical transactions found.';
    }

    const count = similar_transactions.length;
    const avgAmount = similar_transactions.reduce((sum, t) => sum + t.amount, 0) / count;

    return `Found ${count} similar transaction(s) in history with an average amount of ${this.formatCurrency(avgAmount)}.`;
  }

  static extractKeywords(description, classification) {
    const keywords = [];
    const desc = description.toLowerCase();

    // Extract keywords that likely influenced classification
    const accountKeywords = {
      'rent expense': ['rent', 'lease', 'rental'],
      'utilities': ['electric', 'gas', 'water', 'internet', 'phone'],
      'office supplies': ['supplies', 'paper', 'pens', 'staples'],
      'software & subscriptions': ['software', 'saas', 'subscription'],
      'travel expense': ['travel', 'hotel', 'flight', 'uber'],
      'marketing & advertising': ['marketing', 'ad', 'advertising']
    };

    const account = classification.account?.toLowerCase();
    const possibleKeywords = accountKeywords[account] || [];

    possibleKeywords.forEach(kw => {
      if (desc.includes(kw)) {
        keywords.push(`"${kw}"`);
      }
    });

    return keywords;
  }

  static formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
}

// ==========================================
// CONTEXT ENRICHER
// ==========================================

class ContextEnricher {
  /**
   * Add business context to transactions based on description analysis
   */
  static enrich(transaction, parsedDescription) {
    const enrichment = {
      original_transaction: transaction,
      enriched_data: {},
      confidence_factors: []
    };

    // Add vendor context
    if (parsedDescription.entities?.vendor) {
      enrichment.enriched_data.vendor_normalized = parsedDescription.entities.vendor;
      enrichment.enriched_data.vendor_category = this.getVendorCategory(
        parsedDescription.entities.vendor
      );
      enrichment.confidence_factors.push({
        factor: 'known_vendor',
        impact: 0.15,
        note: 'Vendor identified from description'
      });
    }

    // Add product context
    if (parsedDescription.entities?.product) {
      enrichment.enriched_data.product_category = parsedDescription.entities.product;
      enrichment.confidence_factors.push({
        factor: 'product_identified',
        impact: 0.10,
        note: 'Product category recognized'
      });
    }

    // Add quality assessment
    enrichment.enriched_data.description_quality = parsedDescription.quality;
    if (parsedDescription.quality === 'high' || parsedDescription.quality === 'good') {
      enrichment.confidence_factors.push({
        factor: 'high_quality_description',
        impact: 0.08,
        note: 'Description contains sufficient detail'
      });
    }

    // Calculate total confidence boost
    enrichment.total_confidence_boost = enrichment.confidence_factors
      .reduce((sum, f) => sum + f.impact, 0);

    return enrichment;
  }

  static getVendorCategory(vendor) {
    const categories = {
      'Amazon': 'ecommerce',
      'Microsoft': 'technology',
      'Google': 'technology',
      'Salesforce': 'software',
      'Adobe': 'software',
      'AWS': 'cloud_services',
      'Fedex': 'shipping',
      'UPS': 'shipping',
      'Staples': 'office_supplies',
      'Starbucks': 'food_beverage',
      'Uber': 'transportation',
      'Zoom': 'software'
    };

    return categories[vendor] || 'general';
  }
}

// ==========================================
// SENTIMENT ANALYZER (for accounting context)
// ==========================================

class AccountingSentimentAnalyzer {
  /**
   * Analyze sentiment/urgency of accounting transactions
   * Different from general sentiment - focuses on financial indicators
   */
  static analyze(description, transaction) {
    const indicators = {
      urgency: this.assessUrgency(description),
      materiality: this.assessMateriality(transaction),
      risk: this.assessRisk(description),
      complexity: this.assessComplexity(description)
    };

    const overall_score = this.calculateOverallScore(indicators);

    return {
      indicators,
      overall_score,
      recommendation: this.getRecommendation(overall_score, indicators),
      flags: this.identifyFlags(description, transaction)
    };
  }

  static assessUrgency(description) {
    const urgentKeywords = [
      'urgent', 'immediate', 'asap', 'rush', 'emergency', 'critical',
      'overdue', 'late fee', 'penalty'
    ];

    const urgentCount = urgentKeywords.filter(kw =>
      description.toLowerCase().includes(kw)
    ).length;

    return {
      score: Math.min(urgentCount * 0.3, 1.0),
      level: urgentCount > 0 ? 'high' : 'normal',
      keywords_found: urgentCount
    };
  }

  static assessMateriality(transaction) {
    const amount = Math.abs(transaction.amount);

    // Simplified materiality thresholds
    if (amount >= 100000) return { level: 'high', score: 1.0 };
    if (amount >= 50000) return { level: 'medium-high', score: 0.75 };
    if (amount >= 10000) return { level: 'medium', score: 0.5 };
    if (amount >= 5000) return { level: 'low-medium', score: 0.3 };
    return { level: 'low', score: 0.1 };
  }

  static assessRisk(description) {
    const riskKeywords = [
      'related party', 'unusual', 'one-time', 'non-recurring',
      'estimate', 'judgment', 'contingent', 'litigation'
    ];

    const riskCount = riskKeywords.filter(kw =>
      description.toLowerCase().includes(kw)
    ).length;

    return {
      score: Math.min(riskCount * 0.25, 1.0),
      level: riskCount >= 2 ? 'high' : riskCount === 1 ? 'medium' : 'low',
      risk_factors: riskCount
    };
  }

  static assessComplexity(description) {
    const complexityIndicators = [
      'allocation', 'multiple', 'split', 'joint', 'shared',
      'percentage', 'portion', 'partial', 'prorated'
    ];

    const complexity = complexityIndicators.filter(kw =>
      description.toLowerCase().includes(kw)
    ).length;

    return {
      score: Math.min(complexity * 0.2, 1.0),
      level: complexity >= 2 ? 'high' : complexity === 1 ? 'medium' : 'low'
    };
  }

  static calculateOverallScore(indicators) {
    // Weighted average of indicators
    return (
      indicators.urgency.score * 0.3 +
      indicators.materiality.score * 0.4 +
      indicators.risk.score * 0.2 +
      indicators.complexity.score * 0.1
    );
  }

  static getRecommendation(score, indicators) {
    if (score >= 0.7 || indicators.risk.level === 'high') {
      return {
        priority: 'high',
        action: 'Requires senior accountant review',
        sla: '24 hours'
      };
    } else if (score >= 0.4 || indicators.materiality.level === 'medium-high') {
      return {
        priority: 'medium',
        action: 'Standard review process',
        sla: '72 hours'
      };
    } else {
      return {
        priority: 'normal',
        action: 'Routine processing',
        sla: '1 week'
      };
    }
  }

  static identifyFlags(description, transaction) {
    const flags = [];

    if (transaction.isRelatedParty) {
      flags.push({
        type: 'related_party',
        severity: 'high',
        note: 'Related party transaction - disclosure required'
      });
    }

    if (description.toLowerCase().includes('estimate')) {
      flags.push({
        type: 'significant_estimate',
        severity: 'medium',
        note: 'Contains accounting estimate - document assumptions'
      });
    }

    if (transaction.amount > 100000 && !transaction.approvedBy) {
      flags.push({
        type: 'missing_approval',
        severity: 'high',
        note: 'High-value transaction missing approval'
      });
    }

    return flags;
  }
}

// ==========================================
// API ENDPOINTS
// ==========================================

// POST /v1/nlp/analyze-descriptions
app.post('/v1/nlp/analyze-descriptions', [
  body('descriptions').isArray(),
  body('descriptions.*').isString()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { descriptions } = req.body;

  try {
    const results = descriptions.map(desc => {
      const parsed = DescriptionParser.parse(desc);
      const entities = EntityExtractor.extract(desc);

      return {
        original: desc,
        parsed,
        entities,
        enrichment_ready: parsed.quality !== 'none' && parsed.quality !== 'poor'
      };
    });

    res.json({
      success: true,
      results,
      summary: {
        total: descriptions.length,
        high_quality: results.filter(r => r.parsed.quality === 'high' || r.parsed.quality === 'good').length,
        entities_found: results.filter(r => r.entities.entity_count > 0).length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /v1/nlp/generate-explanations
app.post('/v1/nlp/generate-explanations', [
  body('transaction').isObject(),
  body('classification').isObject()
], (req, res) => {
  const { transaction, classification, context } = req.body;

  try {
    const explanation = ExplanationGenerator.generate(
      transaction,
      classification,
      context
    );

    res.json({
      success: true,
      explanation,
      transactionId: transaction.id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /v1/nlp/entities/extract
app.post('/v1/nlp/entities/extract', [
  body('text').isString()
], (req, res) => {
  const { text } = req.body;

  try {
    const entities = EntityExtractor.extract(text);

    res.json({
      success: true,
      entities,
      text_length: text.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /v1/nlp/sentiment/accounting
app.post('/v1/nlp/sentiment/accounting', [
  body('transaction').isObject()
], (req, res) => {
  const { transaction } = req.body;

  try {
    const sentiment = AccountingSentimentAnalyzer.analyze(
      transaction.description || '',
      transaction
    );

    res.json({
      success: true,
      sentiment,
      transactionId: transaction.id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Server
const PORT = process.env.PORT || 8006;
app.listen(PORT, () => {
  console.log(`NLP Processing Service running on port ${PORT}`);
});

module.exports = {
  DescriptionParser,
  EntityExtractor,
  ExplanationGenerator,
  ContextEnricher,
  AccountingSentimentAnalyzer
};