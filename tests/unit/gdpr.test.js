// GDPR Compliance Tests
// Run with: node gdpr.test.js

console.log('\n⚖️  GDPR COMPLIANCE TESTS\n');
console.log('='.repeat(60));

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✅ ${message}`);
        testsPassed++;
    } else {
        console.log(`  ❌ ${message}`);
        testsFailed++;
    }
}

// Mock Database
class MockDB {
    constructor() {
        this.logs = [];
        this.requests = [];
        this.users = [{ id: 1, email: 'user@example.com', active: true }];
        this.apiKeys = [{ id: 1, user_id: 1, key: 'sk_...' }];
    }

    async query(sql, params = []) {
        // Audit Logs
        if (sql.includes('INSERT INTO audit_logs')) {
            this.logs.push({ params });
            return { rowCount: 1 };
        }

        // Deletion Requests
        if (sql.includes('INSERT INTO deletion_requests')) {
            const [userId, reason, scheduledFor] = params;
            this.requests.push({ id: this.requests.length + 1, user_id: userId, reason, scheduled_for: scheduledFor, status: 'pending' });
            return { rowCount: 1 };
        }

        if (sql.includes('SELECT * FROM deletion_requests')) {
            const userId = params[0];
            const pending = this.requests.filter(r => r.user_id === userId && r.status === 'pending');
            return { rows: pending };
        }

        if (sql.includes('UPDATE deletion_requests') && sql.includes('SET status = \'cancelled\'')) {
            const userId = params[0];
            const req = this.requests.find(r => r.user_id === userId && r.status === 'pending');
            if (req) {
                req.status = 'cancelled';
                return { rows: [{ id: req.id }] };
            }
            return { rows: [] };
        }

        // Data Export
        if (sql.includes('SELECT id, email')) return { rows: this.users };
        if (sql.includes('SELECT key_id')) return { rows: this.apiKeys };
        if (sql.includes('SELECT name, description')) return { rows: [] };
        if (sql.includes('SELECT action')) return { rows: [] };

        return { rows: [] };
    }

    async connect() {
        return {
            query: this.query.bind(this),
            release: () => { }
        };
    }
}

// Mock Audit Logger for GDPR Service test
class MockAuditLogger {
    async log(params) {
        return true;
    }
}

// Import Services (simulated require)
const AuditLogger = require('../../services/audit-compliance-service/src/compliance/auditLogger');
const GDPRService = require('../../services/audit-compliance-service/src/compliance/gdprService');

// ==========================================
// TEST 1: Audit Logging
// ==========================================

console.log('\n📝 Test 1: Audit Logging');
console.log('-'.repeat(60));

async function testAuditLogger() {
    const db = new MockDB();
    const logger = new AuditLogger(db);

    await logger.log({
        userId: 1,
        action: 'LOGIN',
        resourceType: 'USER',
        resourceId: 1,
        ipAddress: '127.0.0.1'
    });

    assert(db.logs.length === 1, 'Log entry created');
    assert(db.logs[0].params[1] === 'LOGIN', 'Action recorded correctly');
    assert(db.logs[0].params[4] === '127.0.0.1', 'IP address recorded');
}

testAuditLogger();

// ==========================================
// TEST 2: Deletion Request (Right to be Forgotten)
// ==========================================

console.log('\n📝 Test 2: Deletion Request');
console.log('-'.repeat(60));

async function testDeletionRequest() {
    const db = new MockDB();
    const logger = new MockAuditLogger();
    const gdpr = new GDPRService(db, logger);

    const result = await gdpr.requestDeletion(1, 'Privacy concerns');

    assert(result.status === 'scheduled', 'Request status is scheduled');
    assert(result.grace_period_days === 30, '30-day grace period applied');
    assert(db.requests.length === 1, 'Request stored in DB');

    // Verify date calculation
    const now = new Date();
    const scheduled = new Date(result.scheduled_date);
    const diffDays = Math.round((scheduled - now) / (1000 * 60 * 60 * 24));
    assert(diffDays === 30, 'Scheduled date is 30 days in future');
}

testDeletionRequest();

// ==========================================
// TEST 3: Duplicate Deletion Request
// ==========================================

console.log('\n📝 Test 3: Duplicate Deletion Request');
console.log('-'.repeat(60));

async function testDuplicateRequest() {
    const db = new MockDB();
    const logger = new MockAuditLogger();
    const gdpr = new GDPRService(db, logger);

    await gdpr.requestDeletion(1);
    const result = await gdpr.requestDeletion(1);

    assert(result.status === 'already_requested', 'Detects existing pending request');
    assert(db.requests.length === 1, 'Does not create duplicate request');
}

testDuplicateRequest();

// ==========================================
// TEST 4: Cancel Deletion Request
// ==========================================

console.log('\n📝 Test 4: Cancel Deletion Request');
console.log('-'.repeat(60));

async function testCancelRequest() {
    const db = new MockDB();
    const logger = new MockAuditLogger();
    const gdpr = new GDPRService(db, logger);

    await gdpr.requestDeletion(1);
    const result = await gdpr.cancelDeletion(1);

    assert(result.success === true, 'Cancellation successful');
    assert(db.requests[0].status === 'cancelled', 'Request status updated to cancelled');
}

testCancelRequest();

// ==========================================
// TEST 5: Data Export (Right to Portability)
// ==========================================

console.log('\n📝 Test 5: Data Export');
console.log('-'.repeat(60));

async function testDataExport() {
    const db = new MockDB();
    const logger = new MockAuditLogger();
    const gdpr = new GDPRService(db, logger);

    const exportData = await gdpr.exportUserData(1);

    assert(exportData.user_profile.email === 'user@example.com', 'Includes user profile');
    assert(exportData.api_keys.length === 1, 'Includes API keys');
    assert(exportData.export_date !== undefined, 'Includes export timestamp');
}

testDataExport();

// ==========================================
// TEST SUMMARY
// ==========================================

console.log('\n' + '='.repeat(60));
console.log('TEST SUMMARY');
console.log('='.repeat(60));
console.log(`\n✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`📊 Total: ${testsPassed + testsFailed}`);
console.log(`🎯 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%\n`);

if (testsFailed === 0) {
    console.log('🎉 All GDPR compliance tests passed!');
    console.log('\n✅ Audit logging: WORKING');
    console.log('✅ Deletion requests: WORKING');
    console.log('✅ Grace period enforcement: WORKING');
    console.log('✅ Request cancellation: WORKING');
    console.log('✅ Data export: WORKING');
    console.log('✅ Ready for production deployment\n');
} else {
    console.log('⚠️  Some tests failed. Review the output above.\n');
}
