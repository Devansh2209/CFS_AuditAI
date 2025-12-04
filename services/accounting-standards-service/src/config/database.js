const { Database } = require('@cfs/common-utils');

const dbConfig = {
    host: process.env.DB_HOST || 'accounting_standards_db',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'postgres', // Default to postgres for now since we haven't created specific DBs
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

const db = new Database(dbConfig);

module.exports = db;
