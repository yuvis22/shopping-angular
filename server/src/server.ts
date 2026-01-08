import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import productRoutes from './routes/products';
import imagesRoutes from './routes/images';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Trust proxy for Railway/Render deployments
app.set('trust proxy', 1);

// Middleware
// CORS configuration - allow multiple origins
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://shopping-angular-three.vercel.app',
  'http://localhost:4200',
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, or same-origin requests)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // In development, be more permissive
        if (process.env.NODE_ENV !== 'production') {
          callback(null, true);
        } else {
          // In production, only allow specific origins
          console.warn(`CORS blocked origin: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
// Routes
app.use('/api/products', productRoutes);
app.use('/api/images', imagesRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test Backblaze B2 connection
app.get('/test-b2', async (req, res) => {
  try {
    const { authorizeB2 } = await import('./config/backblaze');
    await authorizeB2();
    res.json({
      status: 'success',
      message: 'Backblaze B2 connection successful',
      hasCredentials: !!(
        process.env.B2_APPLICATION_KEY_ID &&
        process.env.B2_APPLICATION_KEY &&
        process.env.B2_BUCKET_ID &&
        process.env.B2_BUCKET_NAME
      ),
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Backblaze B2 connection failed',
      error: error.message,
    });
  }
});

// Start server
const startServer = async () => {
  try {
    await connectDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
