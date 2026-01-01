import express from 'express';
import {
  getUsers,
  getUser,
  updateUser,
  deleteUser
} from '../controllers/user.controller.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { param } from 'express-validator';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorizeAdmin);

const userIdValidator = [
  param('id').isMongoId().withMessage('Invalid user ID')
];

router
  .route('/')
  .get(getUsers);

router
  .route('/:id')
  .get(userIdValidator, validate, getUser)
  .put(userIdValidator, validate, updateUser)
  .delete(userIdValidator, validate, deleteUser);

export default router;

