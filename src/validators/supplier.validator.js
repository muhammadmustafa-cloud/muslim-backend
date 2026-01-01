import { body, param } from 'express-validator';

export const createSupplierValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Supplier name is required')
    .isLength({ max: 200 }).withMessage('Name cannot be more than 200 characters'),
  
  body('address')
    .trim()
    .notEmpty().withMessage('Address is required')
    .isLength({ max: 500 }).withMessage('Address cannot be more than 500 characters'),
  
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .custom((value) => {
      // If phone is provided, validate format
      if (value && value.trim() !== '') {
        if (!/^[0-9]{10,15}$/.test(value)) {
          throw new Error('Please provide a valid phone number');
        }
      }
      return true;
    })
];

export const updateSupplierValidator = [
  param('id')
    .isMongoId().withMessage('Invalid supplier ID'),
  
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Supplier name cannot be empty')
    .isLength({ max: 200 }).withMessage('Name cannot be more than 200 characters'),
  
  body('address')
    .optional()
    .trim()
    .notEmpty().withMessage('Address cannot be empty')
    .isLength({ max: 500 }).withMessage('Address cannot be more than 500 characters'),
  
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .custom((value) => {
      // If phone is provided, validate format
      if (value && value.trim() !== '') {
        if (!/^[0-9]{10,15}$/.test(value)) {
          throw new Error('Please provide a valid phone number');
        }
      }
      return true;
    }),
  
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean')
];

export const supplierIdValidator = [
  param('id')
    .isMongoId().withMessage('Invalid supplier ID')
];

