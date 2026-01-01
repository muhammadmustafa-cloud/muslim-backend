import express from 'express';
import {
  getPayments,
  getPayment,
  createPayment,
  updatePayment,
  deletePayment
} from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createPaymentValidator,
  updatePaymentValidator,
  paymentIdValidator
} from '../validators/payment.validator.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router
  .route('/')
  .get(getPayments)
  .post(createPaymentValidator, validate, createPayment);

router
  .route('/:id')
  .get(paymentIdValidator, validate, getPayment)
  .put(updatePaymentValidator, validate, updatePayment)
  .delete(paymentIdValidator, validate, deletePayment);

export default router;

