import { validationResult } from 'express-validator';
import { sendError } from '../utils/response.js';

/**
 * Validation middleware - checks validation results
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg
    }));

    return sendError(res, 'Validation failed', 400, errorMessages);
  }

  next();
};

