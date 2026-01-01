import { body, param } from 'express-validator';
import { EXPENSE_CATEGORIES } from '../utils/constants.js';

export const createExpenseValidator = [
  body('category')
    .notEmpty().withMessage('Expense category is required')
    .isIn(Object.values(EXPENSE_CATEGORIES)).withMessage('Invalid expense category'),
  
  body('subCategory')
    .optional()
    .trim(),
  
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ max: 500 }).withMessage('Description cannot be more than 500 characters'),
  
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  
  body('date')
    .optional()
    .isISO8601().withMessage('Date must be a valid date')
    .toDate(),
  
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'bank', 'cheque', 'online']).withMessage('Invalid payment method'),
  
  body('mazdoor')
    .optional()
    .isMongoId().withMessage('Invalid mazdoor ID'),
  
  body('supplier')
    .optional()
    .isMongoId().withMessage('Invalid supplier ID'),
  
  body('billNumber')
    .optional()
    .trim(),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes cannot be more than 1000 characters')
];

export const updateExpenseValidator = [
  param('id')
    .isMongoId().withMessage('Invalid expense ID'),
  
  body('amount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Amount must be a positive number')
];

export const expenseIdValidator = [
  param('id')
    .isMongoId().withMessage('Invalid expense ID')
];

