const crypto = require('crypto');
const { getAuditCollection } = require('../db/mongo');

/**
 * Computes SHA-256 hash for an audit log entry
 */
function computeHash(prevHash, dataObj) {
  const serialized = prevHash + JSON.stringify(dataObj);
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

/**
 * Safely extracts client IP address from request object
 */
function extractIp(req) {
  if (!req) return '127.0.0.1';
  if (typeof req.ip === 'string') return req.ip;
  if (req.headers && req.headers['x-forwarded-for']) {
    return req.headers['x-forwarded-for'].split(',')[0].trim();
  }
  if (req.socket && req.socket.remoteAddress) {
    return req.socket.remoteAddress;
  }
  return '127.0.0.1';
}

/**
 * Writes an immutable, hash-chained audit entry into MongoDB
 */
async function audit(req, action, resource, resourceId = null, details = {}, success = true) {
  try {
    const col = getAuditCollection();

    // Get the latest log entry to link the hash chain
    const lastEntry = await col.find().sort({ seq: -1 }).limit(1).toArray();
    const prevSeq = lastEntry.length > 0 ? lastEntry[0].seq : 0;
    const prevHash = lastEntry.length > 0 ? lastEntry[0].hash : 'GENESIS_HASH_BLOOD_BANK_SYSTEM';

    const seq = prevSeq + 1;
    const ts = new Date().toISOString();
    const userId = req && req.user ? req.user.user_id : null;
    const role = req && req.user ? req.user.role : 'anonymous';
    const ip = extractIp(req);

    const dataObj = {
      seq,
      ts,
      user_id: userId,
      role,
      action,
      resource,
      resource_id: resourceId,
      ip,
      success,
      details
    };

    const hash = computeHash(prevHash, dataObj);

    const document = {
      ...dataObj,
      prev_hash: prevHash,
      hash
    };

    await col.insertOne(document);
    return document;
  } catch (err) {
    console.error('Audit logging error:', err.message);
  }
}

/**
 * Validates the entire MongoDB audit hash chain
 */
async function verifyAuditChain() {
  const col = getAuditCollection();
  const cursor = col.find().sort({ seq: 1 });
  
  let expectedPrevHash = 'GENESIS_HASH_BLOOD_BANK_SYSTEM';
  let totalEntries = 0;

  for await (const entry of cursor) {
    totalEntries++;
    
    // 1. Verify prev_hash link
    if (entry.prev_hash !== expectedPrevHash) {
      return {
        valid: false,
        broken_seq: entry.seq,
        reason: 'BROKEN_LINK_HASH_MISMATCH',
        expected_prev_hash: expectedPrevHash,
        actual_prev_hash: entry.prev_hash
      };
    }

    // 2. Recompute current hash
    const dataObj = {
      seq: entry.seq,
      ts: entry.ts,
      user_id: entry.user_id,
      role: entry.role,
      action: entry.action,
      resource: entry.resource,
      resource_id: entry.resource_id,
      ip: entry.ip,
      success: entry.success,
      details: entry.details
    };

    const computed = computeHash(entry.prev_hash, dataObj);
    if (computed !== entry.hash) {
      return {
        valid: false,
        broken_seq: entry.seq,
        reason: 'TAMPERED_ENTRY_HASH_MISMATCH',
        expected_hash: computed,
        actual_hash: entry.hash
      };
    }

    expectedPrevHash = entry.hash;
  }

  return {
    valid: true,
    total_entries: totalEntries,
    latest_hash: expectedPrevHash
  };
}

module.exports = {
  audit,
  verifyAuditChain,
  computeHash
};
