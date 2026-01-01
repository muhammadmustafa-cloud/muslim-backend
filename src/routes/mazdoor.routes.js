import express from 'express';
import {
  getMazdoors,
  getMazdoor,
  createMazdoor,
  updateMazdoor,
  deleteMazdoor
} from '../controllers/mazdoor.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createMazdoorValidator,
  updateMazdoorValidator,
  mazdoorIdValidator
} from '../validators/mazdoor.validator.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router
  .route('/')
  .get(getMazdoors)
  .post(createMazdoorValidator, validate, createMazdoor);

router
  .route('/:id')
  .get(mazdoorIdValidator, validate, getMazdoor)
  .put(updateMazdoorValidator, validate, updateMazdoor)
  .delete(mazdoorIdValidator, validate, deleteMazdoor);

export default router;

