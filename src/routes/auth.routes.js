import express from 'express';
import {
  register,
  login,
  getMe,
  updatePassword
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  registerValidator,
  loginValidator,
  updatePasswordValidator
} from '../validators/auth.validator.js';

const router = express.Router();

// Public routes
router.post('/register', registerValidator, validate, register);
router.post('/login', loginValidator, validate, login);

// Protected routes
router.get('/me', authenticate, getMe);
router.put('/password', authenticate, updatePasswordValidator, validate, updatePassword);

export default router;

