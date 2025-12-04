// services/business-logic-service/src/ruleEngine.js

class RuleEngine {
    constructor(db, cacheClient) {
        this.db = db;
        this.cache = cacheClient;
        this.CACHE_TTL = 3600; // 1 hour
    }

    /**
     * Evaluate a transaction against industry and custom rules
     * @param {Object} transaction - Transaction to evaluate
     * @param {string} industry - Industry code (e.g., 'software', 'manufacturing')
     * @param {number} clientId - Client ID for custom rules
     * @returns {Promise<Object>} Rule evaluation result
     */
    async evaluateTransaction(transaction, industry, clientId) {
        const startTime = Date.now();

        try {
            // 1. Load industry rules (cached)
            const industryRules = await this.getIndustryRules(industry);

            // 2. Load custom client rules (cached)
            const customRules = await this.getCustomRules(clientId);

            // 3. Combine and sort by priority (higher first)
            const allRules = [
                ...customRules.map(r => ({ ...r, type: 'custom' })),
                ...industryRules.map(r => ({ ...r, type: 'industry' }))
            ].sort((a, b) => b.priority - a.priority);

            // 4. Evaluate each rule until we find a match
            for (const rule of allRules) {
                if (await this.matchesRule(transaction, rule)) {
                    const executionTime = Date.now() - startTime;

                    return {
                        matched: true,
                        rule: {
                            id: rule.id,
                            name: rule.rule_name,
                            type: rule.type,
                            priority: rule.priority
                        },
                        suggestedCategory: rule.target_category || rule.action?.category,
                        confidence: this.calculateRuleConfidence(rule),
                        reasoning: this.generateReasoning(transaction, rule),
                        executionTimeMs: executionTime
                    };
                }
            }

            // No rule matched
            return {
                matched: false,
                executionTimeMs: Date.now() - startTime
            };

        } catch (error) {
            console.error('Rule evaluation error:', error);
            throw error;
        }
    }

    /**
     * Check if transaction matches a rule
     */
    async matchesRule(transaction, rule) {
        // For industry rules: pattern matching
        if (rule.type === 'industry') {
            const pattern = new RegExp(rule.pattern, rule.pattern_flags || 'i');
            return pattern.test(transaction.description);
        }

        // For custom rules: complex condition matching
        if (rule.type === 'custom') {
            return this.evaluateConditions(transaction, rule.conditions);
        }

        return false;
    }

    /**
     * Evaluate complex conditions for custom rules
     */
    evaluateConditions(transaction, conditions) {
        // Description contains
        if (conditions.description_contains) {
            const hasAllKeywords = conditions.description_contains.every(keyword =>
                transaction.description.toLowerCase().includes(keyword.toLowerCase())
            );
            if (!hasAllKeywords) return false;
        }

        // Amount range
        if (conditions.amount_range) {
            const amount = Math.abs(transaction.amount || 0);
            if (conditions.amount_range.min !== undefined && amount < conditions.amount_range.min) {
                return false;
            }
            if (conditions.amount_range.max !== undefined && amount > conditions.amount_range.max) {
                return false;
            }
        }

        // Vendor matches
        if (conditions.vendor_matches && transaction.vendor) {
            const vendorMatches = conditions.vendor_matches.some(v =>
                transaction.vendor.toLowerCase().includes(v.toLowerCase())
            );
            if (!vendorMatches) return false;
        }

        // Date range
        if (conditions.date_range && transaction.date) {
            const txDate = new Date(transaction.date);
            if (conditions.date_range.start && txDate < new Date(conditions.date_range.start)) {
                return false;
            }
            if (conditions.date_range.end && txDate > new Date(conditions.date_range.end)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Calculate confidence score for a rule match
     */
    calculateRuleConfidence(rule) {
        // Base confidence from rule priority
        let confidence = 0.7 + (rule.priority * 0.01);

        // Add confidence boost if specified
        if (rule.confidence_boost) {
            confidence += parseFloat(rule.confidence_boost);
        }

        // Cap at 0.95 (never 100% from rules alone)
        return Math.min(0.95, confidence);
    }

    /**
     * Generate human-readable reasoning for why rule matched
     */
    generateReasoning(transaction, rule) {
        if (rule.reasoning) {
            return rule.reasoning;
        }

        return `Transaction matched ${rule.type} rule "${rule.rule_name}" and was classified as ${rule.target_category || rule.action?.category}`;
    }

    /**
     * Get industry rules (with caching)
     */
    async getIndustryRules(industry) {
        const cacheKey = `industry_rules:${industry}`;

        // Try cache first
        try {
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
        } catch (err) {
            console.warn('Cache read error:', err);
        }

        // Query database
        const result = await this.db.query(`
      SELECT cr.* 
      FROM classification_rules cr
      JOIN industry_profiles ip ON cr.industry_id = ip.id
      WHERE ip.industry_code = $1 AND cr.active = true
      ORDER BY cr.priority DESC
    `, [industry]);

        const rules = result.rows;

        // Cache for future use
        try {
            await this.cache.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(rules));
        } catch (err) {
            console.warn('Cache write error:', err);
        }

        return rules;
    }

    /**
     * Get custom client rules (with caching)
     */
    async getCustomRules(clientId) {
        if (!clientId) return [];

        const cacheKey = `custom_rules:${clientId}`;

        // Try cache first
        try {
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
        } catch (err) {
            console.warn('Cache read error:', err);
        }

        // Query database
        const result = await this.db.query(`
      SELECT * FROM custom_rules
      WHERE client_id = $1 AND active = true
      ORDER BY priority DESC
    `, [clientId]);

        const rules = result.rows;

        // Cache for future use
        try {
            await this.cache.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(rules));
        } catch (err) {
            console.warn('Cache write error:', err);
        }

        return rules;
    }

    /**
     * Invalidate cache for industry or client
     */
    async invalidateCache(type, identifier) {
        const cacheKey = type === 'industry'
            ? `industry_rules:${identifier}`
            : `custom_rules:${identifier}`;

        try {
            await this.cache.del(cacheKey);
        } catch (err) {
            console.warn('Cache invalidation error:', err);
        }
    }

    /**
     * Log rule execution for analytics
     */
    async logExecution(transactionId, clientId, ruleResult, aiResult) {
        try {
            await this.db.query(`
        INSERT INTO rule_execution_log (
          transaction_id, client_id, rule_type, rule_id, rule_name,
          matched, confidence_before, confidence_after,
          category_before, category_after, execution_time_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
                transactionId,
                clientId,
                ruleResult.matched ? ruleResult.rule.type : 'none',
                ruleResult.matched ? ruleResult.rule.id : null,
                ruleResult.matched ? ruleResult.rule.name : null,
                ruleResult.matched,
                aiResult?.confidence || null,
                ruleResult.confidence || aiResult?.confidence || null,
                aiResult?.category || null,
                ruleResult.suggestedCategory || aiResult?.category || null,
                ruleResult.executionTimeMs
            ]);
        } catch (err) {
            console.error('Failed to log rule execution:', err);
        }
    }
}

module.exports = RuleEngine;
