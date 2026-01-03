import { body, param } from 'express-validator';

export const createLabourRateValidator = [
  body('labourExpense')
    .notEmpty().withMessage('Labour expense is required')
    .isMongoId().withMessage('Invalid labour expense ID'),
  
  body('bags')
    .notEmpty().withMessage('Bags is required')
    .isInt({ min: 0 }).withMessage('Bags must be a non-negative integer')
];

export const updateLabourRateValidator = [
  param('id')
    .isMongoId().withMessage('Invalid labour rate ID'),
  
  body('labourExpense')
    .optional()
    .isMongoId().withMessage('Invalid labour expense ID'),
  
  body('bags')
    .optional()
    .isInt({ min: 0 }).withMessage('Bags must be a non-negative integer')
];

export const labourRateIdValidator = [
  param('id')
    .isMongoId().withMessage('Invalid labour rate ID')
];
