// services/business-logic-service/src/aiIntegration.js
const RuleEngine = require('./ruleEngine');
const axios = require('axios');

class AIServiceIntegration {
    constructor(db, cache, aiServiceUrl) {
        this.ruleEngine = new RuleEngine(db, cache);
        // Point to local BERT service
        this.aiServiceUrl = aiServiceUrl || process.env.AI_SERVICE_URL || 'http://localhost:5001';
    }

    /**
     * Enhance AI classification with business logic rules
     * @param {Object} transaction - Transaction to classify
     * @param {string} industry - Industry code
     * @param {number} clientId - Client ID
     * @returns {Promise<Object>} Enhanced classification result
     */
    async enhanceClassification(transaction, industry, clientId) {
        try {
            // 1. Get AI classification
            const aiResult = await this.getAIClassification(transaction);

            // 2. Get business logic suggestion
            const ruleResult = await this.ruleEngine.evaluateTransaction(
                transaction,
                industry,
                clientId
            );

            // 3. Combine AI + Business Logic
            const combined = this.combineResults(aiResult, ruleResult);

            // 4. Log execution for analytics
            await this.ruleEngine.logExecution(
                transaction.id,
                clientId,
                ruleResult,
                aiResult
            );

            return combined;

        } catch (error) {
            console.error('AI integration error:', error);

            // Fallback to rule-only if AI fails
            const ruleResult = await this.ruleEngine.evaluateTransaction(
                transaction,
                industry,
                clientId
            );

            if (ruleResult.matched) {
                return {
                    category: ruleResult.suggestedCategory,
                    confidence: ruleResult.confidence,
                    source: 'rule_only',
                    rule_applied: ruleResult.rule.name,
                    reasoning: ruleResult.reasoning,
                    ai_error: error.message
                };
            }

            throw new Error('Both AI and rule-based classification failed');
        }
    }

    /**
     * Get classification from AI service
     */
    async getAIClassification(transaction) {
        try {
            const response = await axios.post(
                `${this.aiServiceUrl}/v1/classify/transactions`,
                {
                    description: transaction.description,
                    amount: transaction.amount,
                    vendor: transaction.vendor
                },
                {
                    timeout: 5000 // 5 second timeout
                }
            );

            return {
                category: response.data.category,
                confidence: response.data.confidence,
                model_version: response.data.model_version || 'unknown'
            };

        } catch (error) {
            if (error.response) {
                throw new Error(`AI service error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`);
            } else if (error.request) {
                throw new Error('AI service unreachable');
            } else {
                throw error;
            }
        }
    }

    /**
     * Combine AI and rule-based results
     */
    combineResults(aiResult, ruleResult) {
        // Case 1: No rule matched - use AI only
        if (!ruleResult.matched) {
            return {
                category: aiResult.category,
                confidence: aiResult.confidence,
                source: 'ai_only',
                model_version: aiResult.model_version,
                reasoning: 'Classification based on AI model prediction'
            };
        }

        // Case 2: Rule has higher confidence - use rule
        if (ruleResult.confidence > aiResult.confidence) {
            return {
                category: ruleResult.suggestedCategory,
                confidence: ruleResult.confidence,
                source: 'business_rule',
                rule_applied: ruleResult.rule.name,
                ai_suggestion: aiResult.category,
                ai_confidence: aiResult.confidence,
                reasoning: ruleResult.reasoning,
                override_reason: `Business rule (${ruleResult.confidence.toFixed(2)}) overrode AI (${aiResult.confidence.toFixed(2)})`
            };
        }

        // Case 3: AI and rule agree - boost confidence
        if (ruleResult.suggestedCategory === aiResult.category) {
            const boostedConfidence = Math.min(0.99, aiResult.confidence + 0.15);

            return {
                category: aiResult.category,
                confidence: boostedConfidence,
                source: 'ai_and_rule',
                model_version: aiResult.model_version,
                rule_applied: ruleResult.rule.name,
                reasoning: `AI and business rule agree: ${ruleResult.reasoning}`,
                confidence_boost: 0.15
            };
        }

        // Case 4: Conflict - flag for human review
        return {
            category: aiResult.category,  // Default to AI
            confidence: 0.5,  // Low confidence due to conflict
            source: 'conflict',
            requires_review: true,
            conflict: {
                ai_suggests: aiResult.category,
                ai_confidence: aiResult.confidence,
                rule_suggests: ruleResult.suggestedCategory,
                rule_confidence: ruleResult.confidence,
                rule_name: ruleResult.rule.name
            },
            reasoning: `Conflict detected: AI suggests ${aiResult.category} (${(aiResult.confidence * 100).toFixed(1)}%), but rule "${ruleResult.rule.name}" suggests ${ruleResult.suggestedCategory} (${(ruleResult.confidence * 100).toFixed(1)}%). Manual review recommended.`
        };
    }

    /**
     * Batch classification with business logic
     */
    async batchClassify(transactions, industry, clientId) {
        const results = [];

        for (const transaction of transactions) {
            try {
                const result = await this.enhanceClassification(transaction, industry, clientId);
                results.push({
                    transaction_id: transaction.id,
                    ...result
                });
            } catch (error) {
                results.push({
                    transaction_id: transaction.id,
                    error: error.message,
                    category: null,
                    confidence: 0
                });
            }
        }

        return results;
    }
}

module.exports = AIServiceIntegration;
