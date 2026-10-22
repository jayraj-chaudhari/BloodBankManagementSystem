const { ZodError } = require('zod');

function errorHandler(err, req, res, next) {
  // Zod schema validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      }
    });
  }

  // App-level explicit errors
  if (err.status && err.code) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message
      }
    });
  }

  // PostgreSQL-specific mapped errors
  if (err.code) {
    // 23505: Unique constraint violation
    if (err.code === '23505') {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Resource already exists or violates uniqueness constraint'
        }
      });
    }

    // 42501: Insufficient privilege (DAC/RLS block)
    if (err.code === '42501') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Permission denied on database resource'
        }
      });
    }

    // P0001: PL/pgSQL RAISE EXCEPTION (business triggers)
    if (err.code === 'P0001') {
      const msg = err.message || '';
      let code = 'BUSINESS_RULE_VIOLATION';
      if (msg.includes('DONATION_TOO_SOON')) code = 'DONATION_TOO_SOON';
      else if (msg.includes('UNIT_NOT_AVAILABLE')) code = 'UNIT_NOT_AVAILABLE';
      else if (msg.includes('INSUFFICIENT_STOCK')) code = 'INSUFFICIENT_STOCK';
      else if (msg.includes('INCOMPATIBLE_GROUP')) code = 'INCOMPATIBLE_GROUP';

      return res.status(409).json({
        error: {
          code,
          message: msg
        }
      });
    }
  }

  // Generic 500 internal server error - never leak raw SQL or internals
  console.error('[Internal Error]:', err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected internal error occurred'
    }
  });
}

module.exports = errorHandler;
