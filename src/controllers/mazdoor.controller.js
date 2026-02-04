import Mazdoor from '../models/Mazdoor.model.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';
import { NotFoundError } from '../utils/errors.js';

/**
 * Get all mazdoors with pagination
 */
export const getMazdoors = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;

    // Build query
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    // Get mazdoors
    const mazdoors = await Mazdoor.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    const total = await Mazdoor.countDocuments(query);

    sendPaginated(res, mazdoors, { page, limit, total }, 'Mazdoors retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get single mazdoor by ID
 */
export const getMazdoor = async (req, res, next) => {
  try {
    const mazdoor = await Mazdoor.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!mazdoor) {
      throw new NotFoundError('Mazdoor');
    }

    sendSuccess(res, { mazdoor }, 'Mazdoor retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create new mazdoor
 */
export const createMazdoor = async (req, res, next) => {
  try {
    const mazdoorData = {
      ...req.body,
      createdBy: req.user.id
    };

    const mazdoor = await Mazdoor.create(mazdoorData);
    await mazdoor.populate('createdBy', 'name email');

    sendSuccess(res, { mazdoor }, 'Mazdoor created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update mazdoor
 */
export const updateMazdoor = async (req, res, next) => {
  try {
    const mazdoor = await Mazdoor.findById(req.params.id);
    if (!mazdoor) {
      throw new NotFoundError('Mazdoor');
    }

    Object.assign(mazdoor, req.body);
    mazdoor.updatedBy = req.user.id;
    await mazdoor.save();
    await mazdoor.populate('updatedBy', 'name email');

    sendSuccess(res, { mazdoor }, 'Mazdoor updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete mazdoor (soft delete)
 */
export const deleteMazdoor = async (req, res, next) => {
  try {
    const mazdoor = await Mazdoor.findById(req.params.id);
    if (!mazdoor) {
      throw new NotFoundError('Mazdoor');
    }

    mazdoor.isActive = false;
    mazdoor.updatedBy = req.user.id;
    await mazdoor.save();

    sendSuccess(res, null, 'Mazdoor deleted successfully');
  } catch (error) {
    next(error);
  }
};

