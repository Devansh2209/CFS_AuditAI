// Unit Tests for Business Logic Service
// Run with: npm test

const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const RuleEngine = require('../../services/classification-ai-service/src/engine/ruleEngine');
const AIServiceIntegration = require('../../services/classification-ai-service/src/engine/aiIntegration');

// ==========================================
// MOCK DATABASE & CACHE
// ==========================================

class MockDB {
    constructor() {
        this.data = {
            industryRules: [],
            customRules: [],
            executionLog: []
        };
    }

    async query(sql, params) {
        if (sql.includes('classification_rules')) {
            return { rows: this.data.industryRules };
        }
        if (sql.includes('custom_rules')) {
            return { rows: this.data.customRules };
        }
        if (sql.includes('INSERT INTO rule_execution_log')) {
            this.data.executionLog.push(params);
            return { rows: [] };
        }
        return { rows: [] };
    }
}

class MockCache {
    constructor() {
        this.store = {};
    }
    async get(key) { return this.store[key] || null; }
    async setEx(key, ttl, value) { this.store[key] = value; }
    async del(key) { delete this.store[key]; }
}

// ==========================================
// RULE ENGINE TESTS (White Box)
// ==========================================

describe('RuleEngine - White Box Tests', () => {
    let db, cache, ruleEngine;

    beforeEach(() => {
        db = new MockDB();
        cache = new MockCache();
        ruleEngine = new RuleEngine(db, cache);
    });

    describe('Pattern Matching', () => {
        it('should match case-insensitive patterns', async () => {
            const rule = {
                pattern: 'AWS|cloud',
                pattern_flags: 'i',
                type: 'industry'
            };
            const transaction = { description: 'aws infrastructure' };

            const matches = await ruleEngine.matchesRule(transaction, rule);
            expect(matches).toBe(true);
        });

        it('should not match when pattern does not exist', async () => {
            const rule = {
                pattern: 'equipment',
                pattern_flags: 'i',
                type: 'industry'
            };
            const transaction = { description: 'office supplies' };

            const matches = await ruleEngine.matchesRule(transaction, rule);
            expect(matches).toBe(false);
        });
    });

    describe('Condition Evaluation', () => {
        it('should match description_contains condition', () => {
            const transaction = { description: 'AWS cloud infrastructure' };
            const conditions = { description_contains: ['AWS', 'cloud'] };

            const matches = ruleEngine.evaluateConditions(transaction, conditions);
            expect(matches).toBe(true);
        });

        it('should match amount_range condition', () => {
            const transaction = { amount: 5000 };
            const conditions = { amount_range: { min: 0, max: 10000 } };

            const matches = ruleEngine.evaluateConditions(transaction, conditions);
            expect(matches).toBe(true);
        });

        it('should fail when amount out of range', () => {
            const transaction = { amount: 150000 };
            const conditions = { amount_range: { min: 0, max: 100000 } };

            const matches = ruleEngine.evaluateConditions(transaction, conditions);
            expect(matches).toBe(false);
        });

        it('should match vendor condition', () => {
            const transaction = { vendor: 'Amazon Web Services' };
            const conditions = { vendor_matches: ['AWS', 'Amazon'] };

            const matches = ruleEngine.evaluateConditions(transaction, conditions);
            expect(matches).toBe(true);
        });

        it('should match date_range condition', () => {
            const transaction = { date: '2024-06-15' };
            const conditions = {
                date_range: { start: '2024-01-01', end: '2024-12-31' }
            };

            const matches = ruleEngine.evaluateConditions(transaction, conditions);
            expect(matches).toBe(true);
        });
    });

    describe('Confidence Calculation', () => {
        it('should calculate confidence based on priority', () => {
            const rule = { priority: 10, confidence_boost: 0 };
            const confidence = ruleEngine.calculateRuleConfidence(rule);
            expect(confidence).toBe(0.8); // 0.7 + (10 * 0.01)
        });

        it('should add confidence boost', () => {
            const rule = { priority: 10, confidence_boost: 0.15 };
            const confidence = ruleEngine.calculateRuleConfidence(rule);
            expect(confidence).toBe(0.95); // 0.7 + 0.1 + 0.15
        });

        it('should cap confidence at 0.95', () => {
            const rule = { priority: 50, confidence_boost: 0.50 };
            const confidence = ruleEngine.calculateRuleConfidence(rule);
            expect(confidence).toBe(0.95); // Capped
        });
    });

    describe('Cache Operations', () => {
        it('should cache industry rules', async () => {
            db.data.industryRules = [
                { id: 1, rule_name: 'Test Rule', pattern: 'test' }
            ];

            const rules1 = await ruleEngine.getIndustryRules('software');
            const rules2 = await ruleEngine.getIndustryRules('software');

            expect(rules1).toEqual(rules2);
            expect(cache.store['industry_rules:software']).toBeDefined();
        });

        it('should invalidate cache', async () => {
            cache.store['industry_rules:software'] = JSON.stringify([]);
            await ruleEngine.invalidateCache('industry', 'software');
            expect(cache.store['industry_rules:software']).toBeUndefined();
        });
    });
});

// ==========================================
// AI INTEGRATION TESTS (White Box)
// ==========================================

describe('AIServiceIntegration - White Box Tests', () => {
    let db, cache, aiIntegration;

    beforeEach(() => {
        db = new MockDB();
        cache = new MockCache();
        aiIntegration = new AIServiceIntegration(db, cache, 'http://mock-ai');
    });

    describe('Result Combination Logic', () => {
        it('should use AI only when no rule matches', () => {
            const aiResult = { category: 'Operating', confidence: 0.85 };
            const ruleResult = { matched: false };

            const combined = aiIntegration.combineResults(aiResult, ruleResult);

            expect(combined.category).toBe('Operating');
            expect(combined.source).toBe('ai_only');
        });

        it('should use rule when rule confidence > AI confidence', () => {
            const aiResult = { category: 'Investing', confidence: 0.75 };
            const ruleResult = {
                matched: true,
                suggestedCategory: 'Operating',
                confidence: 0.90,
                rule: { name: 'Cloud Costs' }
            };

            const combined = aiIntegration.combineResults(aiResult, ruleResult);

            expect(combined.category).toBe('Operating');
            expect(combined.source).toBe('business_rule');
            expect(combined.ai_suggestion).toBe('Investing');
        });

        it('should boost confidence when AI and rule agree', () => {
            const aiResult = { category: 'Investing', confidence: 0.80 };
            const ruleResult = {
                matched: true,
                suggestedCategory: 'Investing',
                confidence: 0.85,
                rule: { name: 'Equipment Purchase' }
            };

            const combined = aiIntegration.combineResults(aiResult, ruleResult);

            expect(combined.category).toBe('Investing');
            expect(combined.source).toBe('ai_and_rule');
            expect(combined.confidence).toBe(0.95); // 0.80 + 0.15 boost
        });

        it('should flag conflict when AI and rule disagree', () => {
            const aiResult = { category: 'Investing', confidence: 0.85 };
            const ruleResult = {
                matched: true,
                suggestedCategory: 'Operating',
                confidence: 0.80,
                rule: { name: 'Cloud Costs' }
            };

            const combined = aiIntegration.combineResults(aiResult, ruleResult);

            expect(combined.source).toBe('conflict');
            expect(combined.requires_review).toBe(true);
            expect(combined.confidence).toBe(0.5);
            expect(combined.conflict).toBeDefined();
        });
    });
});

// ==========================================
// INTEGRATION TESTS (Black Box)
// ==========================================

describe('Business Logic Service - Integration Tests', () => {
    let db, cache, aiIntegration;

    beforeEach(() => {
        db = new MockDB();
        cache = new MockCache();

        // Setup industry rules
        db.data.industryRules = [
            {
                id: 1,
                rule_name: 'Cloud Infrastructure Costs',
                pattern: 'AWS|Azure|cloud',
                pattern_flags: 'i',
                target_category: 'Operating',
                priority: 25,
                confidence_boost: 0.10,
                reasoning: 'Cloud costs are operating expenses for SaaS'
            }
        ];

        // Mock AI service
        class TestAIIntegration extends AIServiceIntegration {
            async getAIClassification(transaction) {
                if (transaction.description.includes('AWS')) {
                    return { category: 'Investing', confidence: 0.75 };
                }
                return { category: 'Operating', confidence: 0.60 };
            }
        }

        aiIntegration = new TestAIIntegration(db, cache);
    });

    it('should classify AWS transaction as Operating (rule override)', async () => {
        const transaction = {
            id: 'tx_001',
            description: 'AWS cloud infrastructure',
            amount: 5000
        };

        const result = await aiIntegration.enhanceClassification(
            transaction,
            'software',
            null
        );

        expect(result.category).toBe('Operating');
        expect(result.source).toBe('business_rule');
        expect(result.rule_applied).toBe('Cloud Infrastructure Costs');
        expect(result.ai_suggestion).toBe('Investing');
    });

    it('should use AI when no rule matches', async () => {
        const transaction = {
            id: 'tx_002',
            description: 'Office supplies',
            amount: 500
        };

        const result = await aiIntegration.enhanceClassification(
            transaction,
            'software',
            null
        );

        expect(result.category).toBe('Operating');
        expect(result.source).toBe('ai_only');
    });
});

// ==========================================
// PERFORMANCE TESTS
// ==========================================

describe('Performance Tests', () => {
    it('should evaluate 1000 rules in < 100ms', async () => {
        const db = new MockDB();
        const cache = new MockCache();
        const ruleEngine = new RuleEngine(db, cache);

        // Create 1000 rules
        db.data.industryRules = Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            rule_name: `Rule ${i}`,
            pattern: `pattern${i}`,
            pattern_flags: 'i',
            target_category: 'Operating',
            priority: i
        }));

        const transaction = { description: 'pattern500' };
        const startTime = Date.now();

        await ruleEngine.evaluateTransaction(transaction, 'software', null);

        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(100);
    });
});

module.exports = {
    MockDB,
    MockCache
};
