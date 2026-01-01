import express from 'express';
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer
} from '../controllers/customer.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createCustomerValidator,
  updateCustomerValidator,
  customerIdValidator
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

export default router;

