const Joi = require('joi');
const logger = require('../logger');

const validate = (schema, property = 'body') => {
    return (req, res, next) => {
        const { error } = schema.validate(req[property], { abortEarly: false });

        if (error) {
            const details = error.details.map(i => i.message);
            logger.warn('Validation error', {
                path: req.path,
                method: req.method,
                errors: details
            });

            return res.status(400).json({
                error: 'Validation failed',
                details
            });
        }

        next();
    };
};

module.exports = validate;
