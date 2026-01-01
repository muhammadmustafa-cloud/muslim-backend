import { body, param } from 'express-validator';

export const createMazdoorValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Mazdoor name is required')
    .isLength({ max: 200 }).withMessage('Name cannot be more than 200 characters'),
  
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[0-9]{10,15}$/).withMessage('Please provide a valid phone number'),
  
  body('alternatePhone')
    .optional()
    .trim()
    .matches(/^[0-9]{10,15}$/).withMessage('Please provide a valid alternate phone number'),
  
  body('cnic')
    .optional()
    .trim(),
  
  body('address.street').optional().trim(),
  body('address.city').optional().trim(),
  body('address.state').optional().trim(),
  body('address.zipCode').optional().trim(),
  body('address.country').optional().trim(),
  
  body('salary')
    .optional()
    .isFloat({ min: 0 }).withMessage('Salary cannot be negative'),
  
  body('salaryType')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'per_work']).withMessage('Invalid salary type'),
  
  body('hireDate')
    .optional()
    .isISO8601().withMessage('Hire date must be a valid date')
    .toDate(),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes cannot be more than 1000 characters')
];

export const updateMazdoorValidator = [
  param('id')
    .isMongoId().withMessage('Invalid mazdoor ID'),
  
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Mazdoor name cannot be empty'),
  
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean')
];

export const mazdoorIdValidator = [
  param('id')
    .isMongoId().withMessage('Invalid mazdoor ID')
];

