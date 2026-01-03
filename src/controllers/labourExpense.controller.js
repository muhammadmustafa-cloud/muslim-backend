import LabourExpense from '../models/LabourExpense.model.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

/**
 * Get all labour expenses with pagination and search
 */
export const getLabourExpenses = async (req, res, next) => {
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
        { name: { $regex: search, $options: 'i' } }
      ];
    }
    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    // Get labour expenses
    const labourExpenses = await LabourExpense.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email');

    const total = await LabourExpense.countDocuments(query);

    sendPaginated(res, labourExpenses, { page, limit, total }, 'Labour expenses retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get single labour expense by ID
 */
export const getLabourExpense = async (req, res, next) => {
  try {
    const labourExpense = await LabourExpense.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!labourExpense) {
      throw new NotFoundError('Labour expense');
    }

    sendSuccess(res, labourExpense, 'Labour expense retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create new labour expense
 */
export const createLabourExpense = async (req, res, next) => {
  try {
    const { name, rate } = req.body;

    // Check if labour expense with same name already exists
    const existingLabourExpense = await LabourExpense.findOne({ name: name.trim() });
    if (existingLabourExpense) {
      throw new BadRequestError('Labour expense with this name already exists');
    }

    const labourExpense = await LabourExpense.create({
      name: name.trim(),
      rate,
      createdBy: req.user.id
    });

    const populatedExpense = await LabourExpense.findById(labourExpense._id)
      .populate('createdBy', 'name email');

    sendSuccess(res, populatedExpense, 'Labour expense created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update labour expense
 */
export const updateLabourExpense = async (req, res, next) => {
  try {
    const { name, rate } = req.body;
    const { id } = req.params;

    // Check if labour expense exists
    const labourExpense = await LabourExpense.findById(id);
    if (!labourExpense) {
      throw new NotFoundError('Labour expense');
    }

    // Check if name is being changed and if new name already exists
    if (name && name.trim() !== labourExpense.name) {
      const existingLabourExpense = await LabourExpense.findOne({ 
        name: name.trim(),
        _id: { $ne: id }
      });
      if (existingLabourExpense) {
        throw new BadRequestError('Labour expense with this name already exists');
      }
    }

    // Update labour expense
    const updatedLabourExpense = await LabourExpense.findByIdAndUpdate(
      id,
      {
        name: name ? name.trim() : labourExpense.name,
        rate: rate !== undefined ? rate : labourExpense.rate
      },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    sendSuccess(res, updatedLabourExpense, 'Labour expense updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete/Deactivate labour expense
 */
export const deleteLabourExpense = async (req, res, next) => {
  try {
    const { id } = req.params;

    const labourExpense = await LabourExpense.findById(id);
    if (!labourExpense) {
      throw new NotFoundError('Labour expense');
    }

    // Soft delete by setting isActive to false
    await LabourExpense.findByIdAndUpdate(id, { isActive: false });

    sendSuccess(res, null, 'Labour expense deleted successfully');
  } catch (error) {
    next(error);
  }
};
