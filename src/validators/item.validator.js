import { body, param } from 'express-validator';
import { ITEM_TYPES, UNITS } from '../utils/constants.js';

export const createItemValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Item name is required')
    .isLength({ max: 200 }).withMessage('Name cannot be more than 200 characters'),
  
  body('code')
    .optional()
    .trim()
    .toUpperCase(),
  
  body('type')
    .notEmpty().withMessage('Item type is required')
    .isIn(Object.values(ITEM_TYPES)).withMessage('Invalid item type'),
  
  body('category')
    .optional()
    .trim(),
  
  body('unit')
    .notEmpty().withMessage('Unit is required')
    .isIn(Object.values(UNITS)).withMessage('Invalid unit'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot be more than 500 characters'),
  
  body('purchasePrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Purchase price cannot be negative'),
  
  body('sellingPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Selling price cannot be negative'),
  
  body('minStockLevel')
    .optional()
    .isFloat({ min: 0 }).withMessage('Minimum stock level cannot be negative'),
  
  body('maxStockLevel')
    .optional()
    .isFloat({ min: 0 }).withMessage('Maximum stock level cannot be negative'),
  
  body('reorderPoint')
    .optional()
    .isFloat({ min: 0 }).withMessage('Reorder point cannot be negative')
];

export const updateItemValidator = [
  param('id')
    .isMongoId().withMessage('Invalid item ID'),
  
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Item name cannot be empty'),
  
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean')
];

export const itemIdValidator = [
  param('id')
    .isMongoId().withMessage('Invalid item ID')
];

