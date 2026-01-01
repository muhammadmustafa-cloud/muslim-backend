import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';

// Import routes
import authRoutes from './src/routes/auth.routes.js';
import customerRoutes from './src/routes/customer.routes.js';
import supplierRoutes from './src/routes/supplier.routes.js';
import itemRoutes from './src/routes/item.routes.js';
import inventoryRoutes from './src/routes/inventory.routes.js';
import expenseRoutes from './src/routes/expense.routes.js';
import transactionRoutes from './src/routes/transaction.routes.js';
import userRoutes from './src/routes/user.routes.js';
import mazdoorRoutes from './src/routes/mazdoor.routes.js';
import accountRoutes from './src/routes/account.routes.js';
import paymentRoutes from './src/routes/payment.routes.js';
import dailyCashMemoRoutes from './src/routes/dailyCashMemo.routes.js';

// Import middleware
import { errorHandler } from './src/middleware/error.middleware.js';
import { notFound } from './src/middleware/notFound.middleware.js';

// Load environment variables
dotenv.config();

const app = express();

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/mazdoors', mazdoorRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/daily-cash-memos', dailyCashMemoRoutes);

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// Import database config
import database from './src/config/database.js';

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/muslim-dall-mill';
    await database.connect(mongoUri);
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    });
  } catch (error) {
    console.error(`❌ Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`❌ Unhandled Rejection: ${err.message}`);
  process.exit(1);
});

