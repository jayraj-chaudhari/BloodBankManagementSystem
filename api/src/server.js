const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const app = require('./app');
const config = require('./config');
const { connectMongo } = require('./db/mongo');
const { initSocket } = require('./services/socketService');

const server = http.createServer(app);

// Initialize Socket.IO with CORS settings
const io = new Server(server, {
  cors: {
    origin: config.CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Pass IO instance to our socketService
initSocket(io);

io.on('connection', (socket) => {
  // Allow client to authenticate via token to auto-join appropriate rooms
  socket.on('authenticate', (token) => {
    try {
      if (token) {
        const decoded = jwt.verify(token, config.JWT_SECRET);
        socket.user = decoded;

        // Auto-join role room (e.g. role_bb_officer, role_donor, role_admin)
        if (decoded.role) {
          socket.join(`role_${decoded.role}`);
        }
        // Auto-join donor room
        if (decoded.donor_id) {
          socket.join(`donor_${decoded.donor_id}`);
        }
        // Auto-join branch room
        if (decoded.branch_id) {
          socket.join(`branch_${decoded.branch_id}`);
        }
        // Auto-join hospital room
        if (decoded.hospital_id) {
          socket.join(`hospital_${decoded.hospital_id}`);
        }

        socket.emit('authenticated', { user_id: decoded.user_id, role: decoded.role });
      }
    } catch (e) {
      socket.emit('auth_error', { message: 'Authentication failed' });
    }
  });

  // Manual room join handlers
  socket.on('join_branch', (branchId) => {
    socket.join(`branch_${branchId}`);
  });

  socket.on('join_donor', (donorId) => {
    socket.join(`donor_${donorId}`);
  });

  socket.on('join_role', (roleName) => {
    socket.join(`role_${roleName}`);
  });

  socket.on('disconnect', () => {
    // client disconnected
  });
});

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
  io
};
