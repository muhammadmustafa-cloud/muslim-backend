import express from 'express';
import {
  getItems,
  getItem,
  createItem,
  updateItem,
  deleteItem
} from '../controllers/item.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createItemValidator,
  updateItemValidator,
  itemIdValidator
} from '../validators/item.validator.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router
  .route('/')
  .get(getItems)
  .post(createItemValidator, validate, createItem);

router
  .route('/:id')
  .get(itemIdValidator, validate, getItem)
  .put(updateItemValidator, validate, updateItem)
  .delete(itemIdValidator, validate, deleteItem);

export default router;

