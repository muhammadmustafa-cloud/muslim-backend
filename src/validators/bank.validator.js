import { body, param } from 'express-validator';

export const createBankValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Bank name is required')
    .isLength({ max: 200 }).withMessage('Bank name cannot be more than 200 characters'),

  body('accountNumber')
    .trim()
    .notEmpty().withMessage('Bank account number is required')
    .isLength({ max: 50 }).withMessage('Account number cannot be more than 50 characters'),

  body('branch')
    .trim()
    .notEmpty().withMessage('Branch is required')
    .isLength({ max: 200 }).withMessage('Branch cannot be more than 200 characters'),

  body('accountTitle')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 200 }).withMessage('Account title cannot be more than 200 characters'),

  body('iban')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 34 }).withMessage('IBAN cannot be more than 34 characters'),
];

export const updateBankValidator = [
  param('id')
    .isMongoId().withMessage('Invalid bank ID'),

  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Bank name cannot be empty')
    .isLength({ max: 200 }).withMessage('Bank name cannot be more than 200 characters'),

  body('accountNumber')
    .optional()
    .trim()
    .notEmpty().withMessage('Bank account number cannot be empty')
    .isLength({ max: 50 }).withMessage('Account number cannot be more than 50 characters'),

  body('branch')
    .optional()
    .trim()
    .notEmpty().withMessage('Branch cannot be empty')
    .isLength({ max: 200 }).withMessage('Branch cannot be more than 200 characters'),

  body('accountTitle')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 200 }).withMessage('Account title cannot be more than 200 characters'),

  body('iban')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 34 }).withMessage('IBAN cannot be more than 34 characters'),

  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean')
];

export const bankIdValidator = [
  param('id')
    .isMongoId().withMessage('Invalid bank ID')
];
