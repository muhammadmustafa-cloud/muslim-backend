import { sendError } from '../utils/response.js';

/**
 * 404 Not Found middleware
 */
export const notFound = (req, res, next) => {
  sendError(res, `Route ${req.originalUrl} not found`, 404);
};

