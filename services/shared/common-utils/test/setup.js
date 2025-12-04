const chai = require('chai');
const sinon = require('sinon');

// Global configuration
chai.config.includeStack = true;

// Export common testing tools
module.exports = {
    expect: chai.expect,
    sinon
};
