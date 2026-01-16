import express from 'express';
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerTransactionHistory
} from '../controllers/customer.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createCustomerValidator,
  updateCustomerValidator,
  customerIdValidator,
  customerTransactionIdValidator
} from '../validators/customer.validator.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router
  .route('/')
  .get(getCustomers)
  .post(createCustomerValidator, validate, createCustomer);

router
  .route('/:id')
  .get(customerIdValidator, validate, getCustomer)
  .put(updateCustomerValidator, validate, updateCustomer)
  .delete(customerIdValidator, validate, deleteCustomer);

router
  .route('/:customerId/transactions')
  .get(customerTransactionIdValidator, validate, getCustomerTransactionHistory);

export default router;

