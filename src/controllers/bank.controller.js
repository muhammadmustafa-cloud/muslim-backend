import Bank from '../models/Bank.model.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';
import { NotFoundError } from '../utils/errors.js';

/**
 * Get all banks with pagination
 */
export const getBanks = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { accountNumber: { $regex: search, $options: 'i' } },
        { branch: { $regex: search, $options: 'i' } }
      ];
    }
    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    const banks = await Bank.find(query)
      .sort({ name: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    const total = await Bank.countDocuments(query);

    sendPaginated(res, banks, { page, limit, total }, 'Banks retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get single bank by ID
 */
export const getBank = async (req, res, next) => {
  try {
    const bank = await Bank.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!bank) {
      throw new NotFoundError('Bank');
    }

    sendSuccess(res, bank, 'Bank retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create new bank
 */
export const createBank = async (req, res, next) => {
  try {
    const bankData = {
      ...req.body,
      createdBy: req.user.id
    };

    const bank = await Bank.create(bankData);
    await bank.populate('createdBy', 'name email');

    sendSuccess(res, bank, 'Bank created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update bank
 */
export const updateBank = async (req, res, next) => {
  try {
    const bank = await Bank.findById(req.params.id);
    if (!bank) {
      throw new NotFoundError('Bank');
    }

    Object.assign(bank, req.body);
    bank.updatedBy = req.user.id;
    await bank.save();
    await bank.populate('updatedBy', 'name email');

    sendSuccess(res, bank, 'Bank updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete bank (soft delete)
 */
export const deleteBank = async (req, res, next) => {
  try {
    const bank = await Bank.findById(req.params.id);
    if (!bank) {
      throw new NotFoundError('Bank');
    }

    bank.isActive = false;
    bank.updatedBy = req.user.id;
    await bank.save();

    sendSuccess(res, null, 'Bank deleted successfully');
  } catch (error) {
    next(error);
  }
};
