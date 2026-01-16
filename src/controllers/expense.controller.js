import Expense from '../models/Expense.model.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';
import { NotFoundError } from '../utils/errors.js';

/**
 * Get all expenses with pagination
 */
export const getExpenses = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const category = req.query.category;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const mazdoor = req.query.mazdoor;

    // Build query
    const query = {};
    if (category) {
      query.category = category;
    }
    if (mazdoor) {
      query.mazdoor = mazdoor;
    }
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Get expenses
    console.log('Fetching expenses with query:', query);
    const expenses = await Expense.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('mazdoor', 'name phone')
      .populate('supplier', 'name phone')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    console.log('Found expenses:', expenses.length, 'for query:', query);
    const total = await Expense.countDocuments(query);

    // Calculate total amount
    const totalAmount = await Expense.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    sendPaginated(
      res,
      expenses,
      { page, limit, total, totalAmount: totalAmount[0]?.total || 0 },
      'Expenses retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get single expense by ID
 */
export const getExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('mazdoor', 'name phone')
      .populate('supplier', 'name phone')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!expense) {
      throw new NotFoundError('Expense');
    }

    sendSuccess(res, { expense }, 'Expense retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create new expense
 */
export const createExpense = async (req, res, next) => {
  try {
    const expenseData = {
      ...req.body,
      date: req.body.date || new Date(),
      createdBy: req.user.id
    };

    const expense = await Expense.create(expenseData);
    await expense.populate('mazdoor', 'name phone');
    await expense.populate('supplier', 'name phone');
    await expense.populate('createdBy', 'name email');

    sendSuccess(res, { expense }, 'Expense created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update expense
 */
export const updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      throw new NotFoundError('Expense');
    }

    Object.assign(expense, req.body);
    expense.updatedBy = req.user.id;
    await expense.save();
    await expense.populate('updatedBy', 'name email');

    sendSuccess(res, { expense }, 'Expense updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete expense
 */
export const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      throw new NotFoundError('Expense');
    }

    await expense.deleteOne();

    sendSuccess(res, null, 'Expense deleted successfully');
  } catch (error) {
    next(error);
  }
};

