import express from 'express';
import {
  getStockTransactions,
  stockIn,
  stockOut,
  stockAdjustment,
  getStockSummary
} from '../controllers/inventory.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getStockTransactions);
router.post('/in', stockIn);
router.post('/out', stockOut);
router.post('/adjust', stockAdjustment);
router.get('/summary/:itemId', getStockSummary);

export default router;

