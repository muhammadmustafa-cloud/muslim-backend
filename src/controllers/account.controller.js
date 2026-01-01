import Account from '../models/Account.model.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';
import { NotFoundError } from '../utils/errors.js';

/**
 * Get all accounts with pagination
 */
export const getAccounts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const type = req.query.type;
    const isCashAccount = req.query.isCashAccount;
    const isBankAccount = req.query.isBankAccount;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
    const search = req.query.search;

    // Build query
    const query = {};
    if (type) {
      query.type = type;
    }
    if (isCashAccount !== undefined) {
      query.isCashAccount = isCashAccount === 'true';
    }
    if (isBankAccount !== undefined) {
      query.isBankAccount = isBankAccount === 'true';
    }
    if (isActive !== undefined) {
      query.isActive = isActive;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    // Get accounts
    const accounts = await Account.find(query)
      .sort({ code: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    const total = await Account.countDocuments(query);

    // Calculate totals
    const cashAccounts = await Account.find({ ...query, isCashAccount: true });
    const bankAccounts = await Account.find({ ...query, isBankAccount: true });
    
    const totalCash = cashAccounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
    const totalBank = bankAccounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);

    sendPaginated(
      res,
      accounts,
      { 
        page, 
        limit, 
        total,
        totalCash,
        totalBank
      },
      'Accounts retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get single account by ID
 */
export const getAccount = async (req, res, next) => {
  try {
    const account = await Account.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!account) {
      throw new NotFoundError('Account');
    }

    sendSuccess(res, { account }, 'Account retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create new account
 */
export const createAccount = async (req, res, next) => {
  try {
    // Check if code already exists
    const existingAccount = await Account.findOne({ code: req.body.code.toUpperCase() });
    if (existingAccount) {
      return res.status(400).json({
        status: 'error',
        message: 'Account code already exists'
      });
    }

    const accountData = {
      ...req.body,
      code: req.body.code.toUpperCase(),
      currentBalance: req.body.openingBalance || 0,
      createdBy: req.user.id
    };

    const account = await Account.create(accountData);
    await account.populate('createdBy', 'name email');

    sendSuccess(res, { account }, 'Account created successfully', 201);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'Account code already exists'
      });
    }
    next(error);
  }
};

/**
 * Update account
 */
export const updateAccount = async (req, res, next) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) {
      throw new NotFoundError('Account');
    }

    // Don't allow updating code
    delete req.body.code;
    delete req.body.currentBalance; // Balance is managed by payments

    Object.assign(account, req.body);
    account.updatedBy = req.user.id;
    await account.save();
    await account.populate('updatedBy', 'name email');

    sendSuccess(res, { account }, 'Account updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete account (soft delete)
 */
export const deleteAccount = async (req, res, next) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) {
      throw new NotFoundError('Account');
    }

    // Check if account has balance
    if (account.currentBalance !== 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete account with non-zero balance'
      });
    }

    // Soft delete
    account.isActive = false;
    account.updatedBy = req.user.id;
    await account.save();

    sendSuccess(res, null, 'Account deleted successfully');
  } catch (error) {
    next(error);
  }
};

