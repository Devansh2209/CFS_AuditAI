const { Pool } = require('pg');
const logger = require('./logger');

class Database {
    constructor(config) {
        this.pool = new Pool(config);

        this.pool.on('error', (err, client) => {
            logger.error('Unexpected error on idle client', err);
            process.exit(-1);
        });
    }

    async query(text, params) {
        const start = Date.now();
        try {
            const res = await this.pool.query(text, params);
            const duration = Date.now() - start;
            logger.debug('Executed query', { text, duration, rows: res.rowCount });
            return res;
        } catch (error) {
            logger.error('Query error', { text, error: error.message });
            throw error;
        }
    }

    async getClient() {
        constclient = await this.pool.connect();
        const query = client.query;
        const release = client.release;

        // Monkey patch the query method to keep track of the last query executed
        const timeout = setTimeout(() => {
            logger.error('A client has been checked out for more than 5 seconds!');
            logger.error(`The last executed query on this client was: ${client.lastQuery}`);
        }, 5000);

        client.query = (...args) => {
            client.lastQuery = args;
            return query.apply(client, args);
        };

        client.release = () => {
            clearTimeout(timeout);
            client.query = query;
            client.release = release;
            return release.apply(client);
        };

        return client;
    }
}

module.exports = Database;
