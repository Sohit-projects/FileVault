require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

const connectDB = require('./config/database');
const { initCloudinary } = require('./config/cloudinary');
const logger = require('./utils/logger');
const File = require('./models/File');
const { errorHandler, notFound } = require('./middleware/errorHandler');



// ─── INIT ─────────────────────────────────────────────────────────────────────
const app = express();


// Create logs directory
if (!fs.existsSync(path.join(__dirname, 'logs'))) {
  fs.mkdirSync(path.join(__dirname, 'logs'));
}

// ─── DATABASE & FIREBASE ──────────────────────────────────────────────────────
connectDB();
initCloudinary();

// Check and fix publicShareToken index - ensure sparse allows multiple nulls
const fixPublicShareTokenIndex = async () => {
  try {
    // Drop the existing index first
    await File.collection.dropIndex('publicShareToken_1');
    logger.info('✓ Dropped old publicShareToken index');
    
    // Create new index with explicit sparse option
    await File.collection.createIndex(
      { publicShareToken: 1 }, 
      { unique: true, sparse: true, name: 'publicShareToken_1' }
    );
    logger.info('✓ Created sparse publicShareToken index');
  } catch (e) {
    if (e.code === 26) {
      // Index doesn't exist, create it
      await File.collection.createIndex(
        { publicShareToken: 1 }, 
        { unique: true, sparse: true, name: 'publicShareToken_1' }
      );
      logger.info('✓ Created sparse publicShareToken index');
    } else if (e.message?.includes('already exists')) {
      // Already exists, that's fine
      logger.info('✓ publicShareToken index already exists');
    } else {
      logger.error('Index fix error: ' + e.message);
    }
  }
};
fixPublicShareTokenIndex();

// ─── SECURITY MIDDLEWARE ──────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── REQUEST MIDDLEWARE ───────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
  skip: (req) => req.url === '/health',
}));

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/files', require('./routes/files'));

// ─── ERROR HANDLING ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── START SERVER ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated.');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

module.exports = app;
