// services/classification-ai-service/src/engine/complexTransactionParser.js

/**
 * Complex Transaction Parser
 * Handles nested transaction structures, multi-party payments, and advanced financial scenarios
 */

class ComplexTransactionParser {
    /**
     * Parse complex transaction and extract key classification indicators
     */
    parseTransaction(transaction) {
        // Handle both simple and complex transaction formats
        if (this.isSimpleTransaction(transaction)) {
            return this.parseSimpleTransaction(transaction);
        }

        return this.parseComplexTransaction(transaction);
    }

    /**
     * Check if transaction is simple format
     */
    isSimpleTransaction(txn) {
        // If it has complex structure, it's definitely not simple
        if (txn.parties || txn.payment_terms || txn.accounting_treatment) {
            return false;
        }

        // Check description for complex keywords that should trigger rule-based analysis
        const desc = (txn.description || txn.rawInput || '').toLowerCase();
        const complexKeywords = [
            'royalty', 'licensing', 'equity', 'acquisition', 'merger',
            'dividend', 'tax', 'deferred', 'amortization', 'hedging',
            'cross-border', 'intercompany', 'subsidiary'
        ];

        if (complexKeywords.some(keyword => desc.includes(keyword))) {
            return false; // Treat as complex to use rule-based logic
        }

        return true;
    }

    /**
     * Parse simple transaction (existing format)
     */
    parseSimpleTransaction(txn) {
        return {
            description: txn.description || txn.rawInput || '',
            amount: parseFloat(txn.amount) || 0,
            date: txn.date || new Date().toISOString().split('T')[0],
            currency: txn.currency || 'USD',
            metadata: {
                simple: true,
                merchant: txn.merchant || txn.vendor || 'Unknown'
            }
        };
    }

    /**
     * Parse complex transaction with nested structures
     */
    parseComplexTransaction(txn) {
        const parsed = {
            description: this.buildDescription(txn),
            amount: this.calculateEffectiveAmount(txn),
            date: txn.date || new Date().toISOString().split('T')[0],
            currency: txn.currency || 'USD',
            metadata: {
                complex: true,
                transactionType: this.identifyTransactionType(txn),
                parties: this.extractParties(txn),
                taxImplications: this.extractTaxInfo(txn),
                accountingTreatment: this.extractAccountingInfo(txn),
                businessContext: this.extractBusinessContext(txn),
                rawData: txn // Keep original for audit trail
            }
        };

        return parsed;
    }

    /**
     * Build human-readable description from complex transaction
     */
    buildDescription(txn) {
        const type = this.identifyTransactionType(txn);
        const amount = this.calculateEffectiveAmount(txn);
        const currency = txn.currency || 'USD';

        let desc = txn.description || '';

        // Add context from parties
        if (txn.parties) {
            const payee = txn.parties.payee?.name || 'Unknown';
            const payer = txn.parties.payer?.name || 'Unknown';
            desc = `${type} payment from ${payer} to ${payee}: ${desc}`;
        }

        // Add amount context
        if (txn.payment_terms) {
            const terms = [];
            if (txn.payment_terms.base_amount) terms.push(`Base: ${currency} ${txn.payment_terms.base_amount.toLocaleString()}`);
            if (txn.payment_terms.performance_bonus) terms.push(`Bonus: ${currency} ${txn.payment_terms.performance_bonus.toLocaleString()}`);
            if (txn.payment_terms.royalty_advance) terms.push(`Advance: ${currency} ${txn.payment_terms.royalty_advance.toLocaleString()}`);

            if (terms.length > 0) {
                desc += ` (${terms.join(', ')})`;
            }
        }

        return desc || `${type} transaction for ${currency} ${amount.toLocaleString()}`;
    }

    /**
     * Calculate effective transaction amount after fees and withholding
     */
    calculateEffectiveAmount(txn) {
        if (typeof txn.amount === 'number') {
            return txn.amount;
        }

        // Calculate from payment terms
        if (txn.payment_terms) {
            const terms = txn.payment_terms;
            let total = 0;

            total += parseFloat(terms.base_amount || 0);
            total += parseFloat(terms.performance_bonus || 0);
            total += parseFloat(terms.royalty_advance || 0);
            total += parseFloat(terms.currency_hedging_fee || 0);
            total += parseFloat(terms.wire_transfer_fee || 0);
            total += parseFloat(terms.tax_withholding || 0);

            return total;
        }

        return parseFloat(txn.amount) || 0;
    }

    /**
     * Identify transaction type from structure and context
     */
    identifyTransactionType(txn) {
        // Check business context
        if (txn.business_context?.contract_type) {
            const contractType = txn.business_context.contract_type.toLowerCase();

            if (contractType.includes('royalty') || contractType.includes('licensing')) {
                return 'Royalty/Licensing';
            }
            if (contractType.includes('equity') || contractType.includes('investment')) {
                return 'Equity Investment';
            }
            if (contractType.includes('debt') || contractType.includes('loan')) {
                return 'Debt Financing';
            }
            if (contractType.includes('dividend')) {
                return 'Dividend Payment';
            }
        }

        // Check payment terms structure
        if (txn.payment_terms) {
            if (txn.payment_terms.royalty_advance) return 'Royalty Payment';
            if (txn.payment_terms.performance_bonus) return 'Performance-Based Payment';
        }

        // Check accounting treatment
        if (txn.accounting_treatment) {
            const treatment = txn.accounting_treatment.revenue_recognition;
            if (treatment && treatment.includes('IFRS 15')) return 'Revenue Recognition';
            if (txn.accounting_treatment.deferred_revenue) return 'Deferred Revenue';
        }

        // Check description
        const desc = (txn.description || '').toLowerCase();
        if (desc.includes('royalty')) return 'Royalty Payment';
        if (desc.includes('dividend')) return 'Dividend Payment';
        if (desc.includes('investment')) return 'Investment';
        if (desc.includes('loan')) return 'Loan';

        return 'Complex Transaction';
    }

    /**
     * Extract party information
     */
    extractParties(txn) {
        if (!txn.parties) return null;

        return {
            payer: txn.parties.payer?.name || 'Unknown',
            payee: txn.parties.payee?.name || 'Unknown',
            payerCountry: txn.parties.payer?.country || 'Unknown',
            payeeCountry: txn.parties.payee?.country || 'Unknown',
            intermediaries: (txn.parties.intermediaries || []).map(i => ({
                name: i.name,
                role: i.role,
                country: i.country
            })),
            crossBorder: txn.parties.payer?.country !== txn.parties.payee?.country
        };
    }

    /**
     * Extract tax information
     */
    extractTaxInfo(txn) {
        const taxInfo = {
            withholding: 0,
            jurisdictions: [],
            complianceRequirements: []
        };

        if (txn.payment_terms?.tax_withholding) {
            taxInfo.withholding = Math.abs(parseFloat(txn.payment_terms.tax_withholding));
        }

        if (txn.accounting_treatment?.tax_jurisdictions) {
            taxInfo.jurisdictions = txn.accounting_treatment.tax_jurisdictions;
        }

        if (txn.business_context?.compliance_requirements) {
            taxInfo.complianceRequirements = txn.business_context.compliance_requirements;
        }

        return taxInfo;
    }

    /**
     * Extract accounting treatment information
     */
    extractAccountingInfo(txn) {
        if (!txn.accounting_treatment) return null;

        return {
            revenueRecognition: txn.accounting_treatment.revenue_recognition || 'Standard',
            deferredRevenue: parseFloat(txn.accounting_treatment.deferred_revenue || 0),
            amortizationPeriod: txn.accounting_treatment.amortization_period || 'N/A',
            revenueSchedule: txn.accounting_treatment.revenue_schedule || 'N/A'
        };
    }

    /**
     * Extract business context
     */
    extractBusinessContext(txn) {
        if (!txn.business_context) return null;

        return {
            contractType: txn.business_context.contract_type || 'Unknown',
            performanceMetrics: txn.business_context.performance_metrics || [],
            complianceRequirements: txn.business_context.compliance_requirements || []
        };
    }

    /**
     * Determine GAAP category based on transaction analysis
     */
    determineGAAPCategory(parsedTransaction) {
        const type = parsedTransaction.metadata.transactionType;
        const amount = parsedTransaction.amount;
        const accounting = parsedTransaction.metadata.accountingTreatment;

        // Financing Activities
        if (type.includes('Royalty') || type.includes('Licensing')) {
            // Royalty payments are typically financing if they're for IP rights
            if (amount > 100000) { // Large royalty payments
                return {
                    category: 'Financing',
                    subcategory: 'Royalty & Licensing Payments',
                    reasoning: 'Large-scale IP licensing payment classified as financing activity'
                };
            }
        }

        if (type.includes('Equity') || type.includes('Investment')) {
            return {
                category: 'Financing',
                subcategory: 'Equity Transactions',
                reasoning: 'Equity investment classified as financing activity'
            };
        }

        if (type.includes('Debt') || type.includes('Loan')) {
            return {
                category: 'Financing',
                subcategory: 'Debt Transactions',
                reasoning: 'Debt/loan transaction classified as financing activity'
            };
        }

        if (type.includes('Dividend')) {
            return {
                category: 'Financing',
                subcategory: 'Dividend Payments',
                reasoning: 'Dividend payment classified as financing activity'
            };
        }

        // Operating Activities (with deferred revenue)
        if (accounting && accounting.deferredRevenue > 0) {
            return {
                category: 'Operating',
                subcategory: 'Deferred Revenue',
                reasoning: 'Transaction with deferred revenue component classified as operating activity'
            };
        }

        if (type.includes('Performance')) {
            return {
                category: 'Operating',
                subcategory: 'Performance-Based Compensation',
                reasoning: 'Performance-based payment classified as operating activity'
            };
        }

        // Default to Operating for complex transactions
        return {
            category: 'Operating',
            subcategory: 'Complex Transaction',
            reasoning: 'Complex multi-component transaction classified as operating activity'
        };
    }
}

module.exports = ComplexTransactionParser;
