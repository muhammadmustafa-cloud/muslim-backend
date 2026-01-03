import express from 'express';
import {
  getLabourRates,
  getLabourRate,
  createLabourRate,
  updateLabourRate,
  deleteLabourRate
} from '../controllers/labourRate.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createLabourRateValidator,
  updateLabourRateValidator,
  labourRateIdValidator
} from '../validators/labourRate.validator.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router
  .route('/')
  .get(getLabourRates)
  .post(createLabourRateValidator, validate, createLabourRate);

router
  .route('/:id')
  .get(labourRateIdValidator, validate, getLabourRate)
  .put(updateLabourRateValidator, validate, updateLabourRate)
  .delete(labourRateIdValidator, validate, deleteLabourRate);

export default router;
