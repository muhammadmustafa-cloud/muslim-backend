import { body, param } from 'express-validator';
import { ACCOUNT_TYPES } from '../utils/constants.js';

export const createAccountValidator = [
  body('code')
    .trim()
    .notEmpty().withMessage('Account code is required')
    .isLength({ min: 2, max: 20 }).withMessage('Account code must be between 2 and 20 characters')
    .matches(/^[A-Z0-9]+$/).withMessage('Account code must contain only uppercase letters and numbers'),
  
  body('name')
    .trim()
    .notEmpty().withMessage('Account name is required')
    .isLength({ max: 200 }).withMessage('Account name cannot be more than 200 characters'),
  
  body('type')
    .notEmpty().withMessage('Account type is required')
    .isIn(Object.values(ACCOUNT_TYPES)).withMessage('Invalid account type'),
  
  body('isCashAccount')
    .optional()
    .isBoolean().withMessage('isCashAccount must be a boolean'),
  
  body('isBankAccount')
    .optional()
    .isBoolean().withMessage('isBankAccount must be a boolean'),
  
  body('openingBalance')
    .optional()
    .isFloat({ min: 0 }).withMessage('Opening balance must be a positive number'),
  
  body('bankDetails.bankName')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Bank name cannot be more than 100 characters'),
  
  body('bankDetails.accountNumber')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Account number cannot be more than 50 characters'),
  
  body('bankDetails.branch')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Branch name cannot be more than 100 characters'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes cannot be more than 1000 characters')
];

export const updateAccountValidator = [
  param('id')
    .isMongoId().withMessage('Invalid account ID'),
  
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Account name cannot be empty')
    .isLength({ max: 200 }).withMessage('Account name cannot be more than 200 characters'),
  
  body('openingBalance')
    .optional()
    .isFloat({ min: 0 }).withMessage('Opening balance must be a positive number')
];

export const accountIdValidator = [
  param('id')
    .isMongoId().withMessage('Invalid account ID')
];

