const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * JWT Authentication Middleware
 * Expects: Authorization: Bearer <JWT> or ?token=<JWT>
 * Sets: req.user = { user_id, role, clearance, branch_id, hospital_id, donor_id }
 */
function authenticate(req, res, next) {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Missing or malformed Authorization header or token query'
      }
    });
  }

  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    req.user = {
      user_id: payload.user_id,
      role: payload.role,
      clearance: payload.clearance,
      branch_id: payload.branch_id ?? null,
      hospital_id: payload.hospital_id ?? null,
      donor_id: payload.donor_id ?? null
    };
    next();
  } catch (err) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Invalid or expired token'
      }
    });
  }
}

/**
 * RBAC authorization middleware
 * @param  {...string} allowedRoles 
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions for this resource'
        }
      });
    }
    next();
  };
}

module.exports = {
  authenticate,
  authorizeRoles
};
