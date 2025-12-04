const request = require('supertest');
const { expect } = require('@cfs/common-utils/test/setup');
// We need to export 'app' from index.js to test it with supertest
// I will update index.js to export app later.

const BASE_URL = 'http://localhost:8001'; // Testing against running container for now

describe('Accounting Standards API', () => {
    it('should return health check status', async () => {
        const res = await request(BASE_URL).get('/');
        expect(res.status).to.equal(200);
        expect(res.body.status).to.equal('active');
    });

    it('should reject protected route without token', async () => {
        const res = await request(BASE_URL)
            .post('/v1/standards')
            .send({ name: 'New Standard' });

        expect(res.status).to.equal(401);
    });
});
