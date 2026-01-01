import express from 'express';
import {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier
} from '../controllers/supplier.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createSupplierValidator,
  updateSupplierValidator,
  supplierIdValidator
} from '../validators/supplier.validator.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router
  .route('/')
  .get(getSuppliers)
  .post(createSupplierValidator, validate, createSupplier);

router
  .route('/:id')
  .get(supplierIdValidator, validate, getSupplier)
  .put(updateSupplierValidator, validate, updateSupplier)
  .delete(supplierIdValidator, validate, deleteSupplier);

export default router;

