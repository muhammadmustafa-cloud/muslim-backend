import User from '../models/User.model.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';
import { NotFoundError } from '../utils/errors.js';

/**
 * Get all users with pagination
 */
export const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const role = req.query.role;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;

    // Build query
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) {
      query.role = role;
    }
    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    // Get users (exclude passwords)
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    const total = await User.countDocuments(query);

    sendPaginated(res, users, { page, limit, total }, 'Users retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get single user by ID
 */
export const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      throw new NotFoundError('User');
    }

    sendSuccess(res, { user }, 'User retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update user
 */
export const updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Don't allow password update through this route
    const { password, ...updateData } = req.body;

    Object.assign(user, updateData);
    user.updatedBy = req.user.id;
    await user.save();
    await user.populate('updatedBy', 'name email');

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    sendSuccess(res, { user: userResponse }, 'User updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user (soft delete)
 */
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Don't allow deleting yourself
    if (user._id.toString() === req.user.id) {
      return sendError(res, 'You cannot delete your own account', 400);
    }

    user.isActive = false;
    user.updatedBy = req.user.id;
    await user.save();

    sendSuccess(res, null, 'User deleted successfully');
  } catch (error) {
    next(error);
  }
};

