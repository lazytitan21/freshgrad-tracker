/**
 * FreshGrad Tracker API Server with Azure Blob Storage
 * Main entry point for the backend API
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import storage initialization
import { initializeStorage } from './config/storage.js';

// Import routes
import candidatesRoutes from './routes/candidates.js';
import mentorsRoutes from './routes/mentors.js';
import coursesRoutes from './routes/courses.js';
import usersRoutes from './routes/users.js';
import applicantsRoutes from './routes/applicants.js';

// Load environment variables
dotenv.config();

// ES Module path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (same-origin, mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allow localhost for development
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // Allow Azure domains (any *.azurewebsites.net)
    if (origin.includes('.azurewebsites.net')) {
      return callback(null, true);
    }
    
    console.warn(`⚠️ CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes - MUST BE BEFORE STATIC FILES
app.use('/api/candidates', candidatesRoutes);
app.use('/api/mentors', mentorsRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/applicants', applicantsRoutes);

// Serve public assets (hero images, etc.)
const publicDir = path.resolve(__dirname, '..', '..', 'public');
app.use('/Heros', express.static(path.join(publicDir, 'Heros')));
app.use('/hero-manifest.json', express.static(path.join(publicDir, 'hero-manifest.json')));

// Serve frontend build files (dist folder)
const distDir = path.resolve(__dirname, '..', '..', 'dist');
app.use(express.static(distDir));

// Endpoint to list hero images
app.get('/api/heros', (req, res) => {
  const dir = path.join(publicDir, 'Heros');
  fs.readdir(dir, (err, files) => {
    if (err) {
      console.error('Error reading Heros directory:', err);
      return res.status(200).json([]);
    }
    const imgs = files
      .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
      .map(f => path.posix.join('/Heros', f));
    res.json(imgs);
  });
});

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  // Only serve index.html for non-API routes
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(distDir, 'index.html'));
  } else {
    res.status(404).json({ error: 'API route not found' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Initialize storage and start server
async function startServer() {
  try {
    console.log('🚀 Starting FreshGrad Tracker API Server...');
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Initialize Azure Blob Storage
    await initializeStorage();
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌐 API available at http://localhost:${PORT}/api`);
      console.log(`❤️ Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();