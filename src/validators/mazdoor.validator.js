import { body, param } from 'express-validator';

export const createMazdoorValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Mazdoor name is required')
    .isLength({ max: 200 }).withMessage('Name cannot be more than 200 characters'),

  body('phone')
    .optional({ checkFalsy: true })
    .trim(),

  body('hireDate')
    .notEmpty().withMessage('Hire date is required')
    .isISO8601().withMessage('Hire date must be a valid date')
    .toDate(),

  body('salary')
    .notEmpty().withMessage('Salary is required')
    .isFloat({ min: 0 }).withMessage('Salary cannot be negative'),

  body('salaryType')
    .notEmpty().withMessage('Salary type is required')
    .isIn(['daily', 'weekly', 'monthly', 'per_work']).withMessage('Invalid salary type'),
];

export const updateMazdoorValidator = [
  param('id')
    .isMongoId().withMessage('Invalid mazdoor ID'),

  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Mazdoor name cannot be empty'),

  body('phone')
    .optional({ checkFalsy: true })
    .trim(),

  body('hireDate')
    .optional()
    .isISO8601().withMessage('Hire date must be a valid date')
    .toDate(),

  body('salary')
    .optional()
    .isFloat({ min: 0 }).withMessage('Salary cannot be negative'),

  body('salaryType')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'per_work']).withMessage('Invalid salary type'),

  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean')
];

export const mazdoorIdValidator = [
  param('id')
    .isMongoId().withMessage('Invalid mazdoor ID')
];
