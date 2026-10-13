const AppError = require('../utils/AppError');

function sendError(res, statusCode, code, message, details = []) {
  return res.status(statusCode).json({
    success: false,
    error: { code, message, details }
  });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof AppError) {
    return sendError(
      res,
      error.statusCode,
      error.code,
      error.message,
      Array.isArray(error.details) ? error.details : []
    );
  }

  if (error.name === 'CastError') {
    return sendError(res, 400, 'INVALID_ID', 'Invalid identifier');
  }

  if (error.type === 'entity.parse.failed') {
    return sendError(res, 400, 'INVALID_JSON', 'Malformed JSON body');
  }

  console.error(error);
  return sendError(res, 500, 'INTERNAL_ERROR', 'Internal server error');
}

module.exports = errorHandler;