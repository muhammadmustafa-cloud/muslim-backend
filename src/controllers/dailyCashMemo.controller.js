import DailyCashMemo from '../models/DailyCashMemo.model.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

/**
 * Get all daily cash memos with pagination
 */
export const getDailyCashMemos = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    // Build query
    const query = {};
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Get daily cash memos
    const memos = await DailyCashMemo.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    const total = await DailyCashMemo.countDocuments(query);

    sendPaginated(res, memos, { page, limit, total }, 'Daily cash memos retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get single daily cash memo by ID
 */
export const getDailyCashMemo = async (req, res, next) => {
  try {
    const memo = await DailyCashMemo.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!memo) {
      throw new NotFoundError('Daily cash memo');
    }

    sendSuccess(res, { memo }, 'Daily cash memo retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get daily cash memo by date
 */
export const getDailyCashMemoByDate = async (req, res, next) => {
  try {
    const { date } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const entryType = req.query.entryType; // 'credit' or 'debit'

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);

    // First, get the memo if it exists
    let memo = await DailyCashMemo.findOne({
      date: { $gte: targetDate, $lte: endDate }
    });

    // If no memo exists, return a default one
    if (!memo) {
      return sendSuccess(res, { 
        memo: {
          date: targetDate,
          creditEntries: [],
          debitEntries: [],
          previousBalance: 0,
          notes: ''
        },
        creditTotal: 0,
        debitTotal: 0
      }, 'No memo found for this date');
    }

    // Get paginated entries if entryType is specified
    let entries = [];
    let total = 0;
    
    if (entryType === 'credit' || entryType === 'debit') {
      const field = `${entryType}Entries`;
      total = memo[field].length;
      
      // Get paginated entries
      const result = await DailyCashMemo.aggregate([
        { $match: { _id: memo._id } },
        { $project: {
          [field]: { $slice: [`$${field}`, skip, limit] },
          total: { $size: `$${field}` }
        }}
      ]);
      
      if (result.length > 0) {
        entries = result[0][field];
        total = result[0].total;
      }
      
      return sendPaginated(res, { [field]: entries }, { 
        page, 
        limit, 
        total 
      }, 'Entries retrieved successfully');
    }

    // If no entryType is specified, return the full memo with limited entries
    const result = await DailyCashMemo.aggregate([
      { $match: { _id: memo._id } },
      { $project: {
        creditEntries: { $slice: ["$creditEntries", 0, limit] },
        debitEntries: { $slice: ["$debitEntries", 0, limit] },
        creditTotal: { $size: "$creditEntries" },
        debitTotal: { $size: "$debitEntries" },
        date: 1,
        notes: 1,
        previousBalance: 1,
        createdAt: 1,
        updatedAt: 1,
        createdBy: 1,
        updatedBy: 1
      }}
    ]);

    if (result.length === 0) {
      throw new NotFoundError('Daily cash memo');
    }

    const populatedMemo = await DailyCashMemo.populate(result[0], [
      { path: 'createdBy', select: 'name email' },
      { path: 'updatedBy', select: 'name email' }
    ]);

    sendSuccess(res, { 
      memo: {
        ...populatedMemo,
        creditTotal: result[0].creditTotal,
        debitTotal: result[0].debitTotal
      } 
    }, 'Daily cash memo retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get previous day's closing balance
 */
export const getPreviousBalance = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) {
      return sendSuccess(res, { previousBalance: 0 }, 'Previous balance retrieved');
    }

    const targetDate = new Date(date);
    targetDate.setDate(targetDate.getDate() - 1); // Previous day
    targetDate.setHours(23, 59, 59, 999);

    const previousMemo = await DailyCashMemo.findOne({
      date: { $lte: targetDate }
    })
      .sort({ date: -1 })
      .limit(1);

    const previousBalance = previousMemo?.closingBalance || 0;

    sendSuccess(res, { previousBalance }, 'Previous balance retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create new daily cash memo
 */
export const createDailyCashMemo = async (req, res, next) => {
  try {
    const { date, creditEntries, debitEntries, previousBalance, notes } = req.body;

    // Check if memo already exists for this date
    const existingMemo = await DailyCashMemo.findOne({ date: new Date(date) });
    if (existingMemo) {
      throw new ValidationError('Daily cash memo already exists for this date');
    }

    const memoData = {
      date: new Date(date),
      creditEntries: creditEntries || [],
      debitEntries: debitEntries || [],
      previousBalance: previousBalance || 0,
      notes: notes || '',
      createdBy: req.user.id
    };

    const memo = await DailyCashMemo.create(memoData);
    await memo.populate('createdBy', 'name email');

    sendSuccess(res, { memo }, 'Daily cash memo created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update daily cash memo
 */
export const updateDailyCashMemo = async (req, res, next) => {
  try {
    const memo = await DailyCashMemo.findById(req.params.id);
    if (!memo) {
      throw new NotFoundError('Daily cash memo');
    }

    const { creditEntries, debitEntries, previousBalance, notes } = req.body;

    // Update fields
    if (creditEntries !== undefined) memo.creditEntries = creditEntries;
    if (debitEntries !== undefined) memo.debitEntries = debitEntries;
    if (previousBalance !== undefined) memo.previousBalance = previousBalance;
    if (notes !== undefined) memo.notes = notes;

    memo.updatedBy = req.user.id;
    await memo.save();
    await memo.populate('updatedBy', 'name email');

    sendSuccess(res, { memo }, 'Daily cash memo updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete daily cash memo
 */
export const deleteDailyCashMemo = async (req, res, next) => {
  try {
    const memo = await DailyCashMemo.findById(req.params.id);
    if (!memo) {
      throw new NotFoundError('Daily cash memo');
    }

    await memo.deleteOne();

    sendSuccess(res, null, 'Daily cash memo deleted successfully');
  } catch (error) {
    next(error);
  }
};

