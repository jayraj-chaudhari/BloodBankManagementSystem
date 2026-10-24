const { ZodError } = require('zod');

function errorHandler(err, req, res, next) {
  // 1. Zod schema validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      }
    });
  }

  // 2. Explicit Application errors (throw { status, code, message })
  if (err.status && err.code) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message
      }
    });
  }

  // 3. PostgreSQL PL/pgSQL RAISE EXCEPTION errors ('CODE: message')
  if (err.code === 'P0001' && err.message) {
    const colonIdx = err.message.indexOf(':');
    if (colonIdx !== -1) {
      const parsedCode = err.message.substring(0, colonIdx).trim();
      const parsedMessage = err.message.substring(colonIdx + 1).trim();

      const statusMap = {
        'VALIDATION_ERROR': 400,
        'UNAUTHENTICATED': 401,
        'FORBIDDEN': 403,
        'ACCOUNT_LOCKED': 403,
        'NOT_FOUND': 404,
        'DONATION_TOO_SOON': 409,
        'UNIT_NOT_AVAILABLE': 409,
        'INSUFFICIENT_STOCK': 409,
        'INCOMPATIBLE_GROUP': 409,
        'EMAIL_TAKEN': 409,
        'REQUEST_CLOSED': 409,
        'DONOR_NOT_ELIGIBLE': 409,
        'CONFLICT': 409
      };

      const httpStatus = statusMap[parsedCode] || 400;
      return res.status(httpStatus).json({
        error: {
          code: parsedCode,
          message: parsedMessage
        }
      });
    }
  }

  // 4. PostgreSQL standard error codes
  if (err.code) {
    // 23505: unique_violation
    if (err.code === '23505') {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Resource violates uniqueness constraint or already exists'
        }
      });
    }

    // 23503: foreign_key_violation
    if (err.code === '23503') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Referenced entity does not exist'
        }
      });
    }

    // 42501: insufficient_privilege (DAC/RLS)
    if (err.code === '42501') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied by database security policy'
        }
      });
    }
  }

  // 5. Default 500 internal server error - never leak raw SQL text or sensitive stack
  console.error('[Unhandled Internal Error]:', err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An internal server error occurred'
    }
  });
}

module.exports = errorHandler;
