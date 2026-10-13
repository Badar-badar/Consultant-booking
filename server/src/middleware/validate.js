const AppError = require('../utils/AppError');

function validate(schema, source) {
  return async function validateRequest(req, res, next) {
    try {
      const result = await schema.safeParseAsync(req[source]);

      if (!result.success) {
        const details = result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message
        }));
        throw new AppError(400, 'Validation failed', 'VALIDATION_ERROR', details);
      }

      req[source] = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = validate;