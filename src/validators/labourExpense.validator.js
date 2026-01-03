import { body, param } from 'express-validator';

export const createLabourExpenseValidator = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .trim()
    .isLength({ max: 100 }).withMessage('Name cannot be more than 100 characters'),
  
  body('rate')
    .notEmpty().withMessage('Rate is required')
    .isFloat({ min: 0 }).withMessage('Rate must be a positive number')
];

export const updateLabourExpenseValidator = [
  param('id')
    .isMongoId().withMessage('Invalid labour expense ID'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Name cannot be more than 100 characters'),
  
  body('rate')
    .optional()
    .isFloat({ min: 0 }).withMessage('Rate must be a positive number')
];

export const labourExpenseIdValidator = [
  param('id')
    .isMongoId().withMessage('Invalid labour expense ID')
];
