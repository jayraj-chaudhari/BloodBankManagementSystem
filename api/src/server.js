const http = require('http');
const app = require('./app');
const config = require('./config');
const { connectMongo } = require('./db/mongo');

const server = http.createServer(app);

async function startServer() {
  try {
    // Connect to MongoDB audit store
    await connectMongo();

    server.listen(config.PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${config.PORT}`);
      console.log(`API base URL: http://localhost:${config.PORT}/api/v1`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
