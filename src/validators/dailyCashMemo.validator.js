import { body, param } from 'express-validator';

const cashEntryValidator = [
  body('creditEntries.*.name')
    .optional()
    .trim()
    .notEmpty().withMessage('Credit entry name is required')
    .isLength({ max: 200 }).withMessage('Name cannot be more than 200 characters'),
  
  body('creditEntries.*.description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot be more than 500 characters'),
  
  body('creditEntries.*.amount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  
  body('debitEntries.*.name')
    .optional()
    .trim()
    .notEmpty().withMessage('Debit entry name is required')
    .isLength({ max: 200 }).withMessage('Name cannot be more than 200 characters'),
  
  body('debitEntries.*.description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot be more than 500 characters'),
  
  body('debitEntries.*.amount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Amount must be a positive number')
];

export const createDailyCashMemoValidator = [
  body('date')
    .notEmpty().withMessage('Date is required')
    .isISO8601().withMessage('Date must be a valid ISO 8601 date'),
  
  body('previousBalance')
    .optional()
    .isFloat({ min: 0 }).withMessage('Previous balance must be a positive number'),
  
  body('creditEntries')
    .optional()
    .isArray().withMessage('Credit entries must be an array'),
  
  body('debitEntries')
    .optional()
    .isArray().withMessage('Debit entries must be an array'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes cannot be more than 1000 characters'),
  
  ...cashEntryValidator
];

export const updateDailyCashMemoValidator = [
  body('previousBalance')
    .optional()
    .isFloat({ min: 0 }).withMessage('Previous balance must be a positive number'),
  
  body('creditEntries')
    .optional()
    .isArray().withMessage('Credit entries must be an array'),
  
  body('debitEntries')
    .optional()
    .isArray().withMessage('Debit entries must be an array'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes cannot be more than 1000 characters'),
  
  ...cashEntryValidator
];

export const dailyCashMemoIdValidator = [
  param('id')
    .notEmpty().withMessage('ID is required')
    .isMongoId().withMessage('Invalid ID format')
];

