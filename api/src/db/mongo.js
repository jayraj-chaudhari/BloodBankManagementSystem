const { MongoClient } = require('mongodb');
const config = require('../config');

let client = null;
let db = null;

async function connectMongo() {
  if (db) return db;
  try {
    client = new MongoClient(config.MONGO_URL);
    await client.connect();
    db = client.db('bloodbank_audit');
    
    // Ensure index on seq for fast audit chain traversal
    await db.collection('audit_log').createIndex({ seq: 1 }, { unique: true });
    await db.collection('audit_log').createIndex({ ts: -1 });
    await db.collection('audit_log').createIndex({ user_id: 1 });
    await db.collection('audit_log').createIndex({ action: 1 });

    console.log('Connected to MongoDB audit database');
    return db;
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    throw err;
  }
}

function getAuditCollection() {
  if (!db) {
    throw new Error('MongoDB not initialized. Call connectMongo() first.');
  }
  return db.collection('audit_log');
}

module.exports = {
  connectMongo,
  getAuditCollection,
  getDb: () => db,
  getClient: () => client
};
