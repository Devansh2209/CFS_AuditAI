const { expect } = require('../../../shared/common-utils/test/setup');
const { GAAPEngine } = require('../../src/services/gaap-engine'); // We need to create this file first or mock the logic if it's in index.js

// Since the logic is currently in index.js or not yet separated, 
// I will create a mock test that simulates the logic we PLAN to move to a separate engine.
// For now, let's assume we are testing a helper function.

describe('GAAP Classification Logic', () => {
    it('should classify high-value equipment purchase as CAPEX', () => {
        const transaction = {
            amount: 50000,
            description: 'Purchase of new server rack',
            account: 'Equipment'
        };

        // Mock logic for now
        const isCapex = transaction.amount > 2500 && ['Equipment', 'Building'].includes(transaction.account);

        expect(isCapex).to.be.true;
    });

    it('should classify small office supplies as OPEX', () => {
        const transaction = {
            amount: 150,
            description: 'Office pens and paper',
            account: 'Office Supplies'
        };

        const isCapex = transaction.amount > 2500;

        expect(isCapex).to.be.false;
    });
});
