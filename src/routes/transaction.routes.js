import express from 'express';
import {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransactionPayment,
  deleteTransaction
} from '../controllers/transaction.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { param } from 'express-validator';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

const transactionIdValidator = [
  param('id').isMongoId().withMessage('Invalid transaction ID')
];

router
  .route('/')
  .get(getTransactions)
  .post(createTransaction);

router
  .route('/:id')
  .get(transactionIdValidator, validate, getTransaction)
  .delete(transactionIdValidator, validate, deleteTransaction);

router.put('/:id/payment', transactionIdValidator, validate, updateTransactionPayment);

export default router;

