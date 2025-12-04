const csv = require('csv-parser');
const { Readable } = require('stream');

const processCSV = (buffer) => {
    return new Promise((resolve, reject) => {
        const results = [];
        const stream = Readable.from(buffer);

        stream
            .pipe(csv())
            .on('data', (data) => {
                // Normalize keys to lowercase
                const normalized = {};
                Object.keys(data).forEach(key => {
                    normalized[key.toLowerCase().trim()] = data[key];
                });

                // Basic validation & mapping
                if (normalized.date && normalized.amount && normalized.description) {
                    results.push({
                        date: normalized.date,
                        amount: parseFloat(normalized.amount.replace(/[^0-9.-]+/g, '')),
                        description: normalized.description,
                        merchant: normalized.merchant || normalized.description, // Fallback
                        category: normalized.category || 'Uncategorized',
                        source_system: 'manual_upload'
                    });
                }
            })
            .on('end', () => {
                resolve(results);
            })
            .on('error', (error) => {
                reject(error);
            });
    });
};

module.exports = { processCSV };
