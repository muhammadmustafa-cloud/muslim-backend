import { body, param } from 'express-validator';

export const createPaymentValidator = [
  body('type')
    .notEmpty().withMessage('Payment type is required')
    .isIn(['payment', 'receipt']).withMessage('Payment type must be either payment or receipt'),
  
  body('date')
    .notEmpty().withMessage('Date is required')
    .isISO8601().withMessage('Date must be a valid date')
    .toDate(),
  
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ max: 500 }).withMessage('Description cannot be more than 500 characters'),
  
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  
  body('paymentMethod')
    .notEmpty().withMessage('Payment method is required')
    .isIn(['cash', 'cheque', 'bank_transfer', 'online']).withMessage('Invalid payment method'),
  
  body('chequeNumber')
    .optional()
    .trim()
    .custom((value, { req }) => {
      if (req.body.paymentMethod === 'cheque' && !value) {
        throw new Error('Cheque number is required when payment method is cheque');
      }
      return true;
    }),
  
  body('fromAccount')
    .if(body('type').equals('payment'))
    .notEmpty().withMessage('From account is required for payments')
    .isMongoId().withMessage('Invalid from account ID'),
  
  body('toAccount')
    .if(body('type').equals('receipt'))
    .notEmpty().withMessage('To account is required for receipts')
    .isMongoId().withMessage('Invalid to account ID'),
  
  body('paidTo')
    .optional()
    .trim(),
  
  body('receivedFrom')
    .optional()
    .trim(),
  
  body('mazdoor')
    .optional()
    .isMongoId().withMessage('Invalid mazdoor ID'),
  
  body('customer')
    .optional()
    .isMongoId().withMessage('Invalid customer ID'),
  
  body('supplier')
    .optional()
    .isMongoId().withMessage('Invalid supplier ID'),
  
  body('category')
    .optional()
    .isIn(['mazdoor', 'electricity', 'rent', 'transport', 'raw_material', 'maintenance', 'other', 'customer_payment', 'supplier_payment'])
    .withMessage('Invalid category'),
  
  body('status')
    .optional()
    .isIn(['draft', 'posted', 'cancelled']).withMessage('Invalid status'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes cannot be more than 1000 characters')
];

export const updatePaymentValidator = [
  param('id')
    .isMongoId().withMessage('Invalid payment ID'),
  
  body('amount')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0')
];

export const paymentIdValidator = [
  param('id')
    .isMongoId().withMessage('Invalid payment ID')
];

