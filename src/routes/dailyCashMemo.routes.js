import express from 'express';
import {
  getDailyCashMemos,
  getDailyCashMemo,
  getDailyCashMemoByDate,
  getPreviousBalance,
  createDailyCashMemo,
  updateDailyCashMemo,
  deleteDailyCashMemo
} from '../controllers/dailyCashMemo.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createDailyCashMemoValidator,
  updateDailyCashMemoValidator,
  dailyCashMemoIdValidator
} from '../validators/dailyCashMemo.validator.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/previous-balance', getPreviousBalance);

router
  .route('/')
  .get(getDailyCashMemos)
  .post(createDailyCashMemoValidator, validate, createDailyCashMemo);

router
  .route('/date/:date')
  .get(getDailyCashMemoByDate);

router
  .route('/:id')
  .get(dailyCashMemoIdValidator, validate, getDailyCashMemo)
  .put(updateDailyCashMemoValidator, validate, updateDailyCashMemo)
  .delete(dailyCashMemoIdValidator, validate, deleteDailyCashMemo);

export default router;

