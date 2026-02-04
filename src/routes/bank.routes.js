import express from 'express';
import {
  getBanks,
  getBank,
  createBank,
  updateBank,
  deleteBank
} from '../controllers/bank.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createBankValidator,
  updateBankValidator,
  bankIdValidator
} from '../validators/bank.validator.js';

const router = express.Router();

router.use(authenticate);

router
  .route('/')
  .get(getBanks)
  .post(createBankValidator, validate, createBank);

router
  .route('/:id')
  .get(bankIdValidator, validate, getBank)
  .put(updateBankValidator, validate, updateBank)
  .delete(bankIdValidator, validate, deleteBank);

export default router;
