import express from 'express';
import {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense
} from '../controllers/expense.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createExpenseValidator,
  updateExpenseValidator,
  expenseIdValidator
} from '../validators/expense.validator.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router
  .route('/')
  .get(getExpenses)
  .post(createExpenseValidator, validate, createExpense);

router
  .route('/:id')
  .get(expenseIdValidator, validate, getExpense)
  .put(updateExpenseValidator, validate, updateExpense)
  .delete(expenseIdValidator, validate, deleteExpense);

export default router;

