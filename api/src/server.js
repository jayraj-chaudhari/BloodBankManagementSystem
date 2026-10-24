const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const config = require('./config');
const { connectMongo } = require('./db/mongo');

const server = http.createServer(app);

// Initialize Socket.IO with CORS settings
const io = new Server(server, {
  cors: {
    origin: config.CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log(`Socket client connected: ${socket.id}`);

  socket.on('join_branch', (branchId) => {
    socket.join(`branch_${branchId}`);
  });

  socket.on('disconnect', () => {
    // disconnected
  });
});

// Helper to broadcast events from controllers/services
function getIO() {
  return io;
}

async function startServer() {
  try {
    // Attempt MongoDB connection for audit log store
    try {
      await connectMongo();
    } catch (mongoErr) {
      console.warn(`[Warning] Could not connect to MongoDB at ${config.MONGO_URL}: ${mongoErr.message}. API will run in resilient mode.`);
    }

    server.listen(config.PORT, () => {
      console.log(`Blood Bank API server running on port ${config.PORT}`);
      console.log(`API Base URL: http://localhost:${config.PORT}/api/v1`);
      console.log(`Health check: http://localhost:${config.PORT}/api/v1/health`);
    });
  } catch (err) {
    console.error('Fatal error starting server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = {
  server,
  app,
  io,
  getIO
};
