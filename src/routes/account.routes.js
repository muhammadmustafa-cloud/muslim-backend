import express from 'express';
import {
  getAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount
} from '../controllers/account.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createAccountValidator,
  updateAccountValidator,
  accountIdValidator
} from '../validators/account.validator.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router
  .route('/')
  .get(getAccounts)
  .post(createAccountValidator, validate, createAccount);

router
  .route('/:id')
  .get(accountIdValidator, validate, getAccount)
  .put(updateAccountValidator, validate, updateAccount)
  .delete(accountIdValidator, validate, deleteAccount);

export default router;

