const { Database } = require('@cfs/common-utils');

const dbConfig = {
    host: process.env.DB_HOST || 'security_db',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

const db = new Database(dbConfig);

module.exports = db;
