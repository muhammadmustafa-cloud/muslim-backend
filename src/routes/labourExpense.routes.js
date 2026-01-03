import express from 'express';
import {
  getLabourExpenses,
  getLabourExpense,
  createLabourExpense,
  updateLabourExpense,
  deleteLabourExpense
} from '../controllers/labourExpense.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createLabourExpenseValidator,
  updateLabourExpenseValidator,
  labourExpenseIdValidator
} from '../validators/labourExpense.validator.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router
  .route('/')
  .get(getLabourExpenses)
  .post(createLabourExpenseValidator, validate, createLabourExpense);

router
  .route('/:id')
  .get(labourExpenseIdValidator, validate, getLabourExpense)
  .put(updateLabourExpenseValidator, validate, updateLabourExpense)
  .delete(labourExpenseIdValidator, validate, deleteLabourExpense);

export default router;
