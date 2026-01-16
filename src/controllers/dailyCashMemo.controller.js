import DailyCashMemo from '../models/DailyCashMemo.model.js';
import Payment from '../models/Payment.model.js';
import Expense from '../models/Expense.model.js';
import Account from '../models/Account.model.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { ENTRY_TYPES } from '../utils/constants.js';

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
      .populate('updatedBy', 'name email')
      .populate('creditEntries.account', 'name code')
      .populate('creditEntries.customer', 'name')
      .populate('debitEntries.mazdoor', 'name')
      .populate('debitEntries.supplier', 'name');

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
      .populate('updatedBy', 'name email')
      .populate('creditEntries.account', 'name code')
      .populate('creditEntries.customer', 'name')
      .populate('debitEntries.mazdoor', 'name')
      .populate('debitEntries.supplier', 'name');

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

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);

    // First, get the memo if it exists
    let memo = await DailyCashMemo.findOne({
      date: { $gte: targetDate, $lte: endDate }
    })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('creditEntries.account', 'name code')
      .populate('creditEntries.customer', 'name')
      .populate('debitEntries.mazdoor', 'name')
      .populate('debitEntries.supplier', 'name');

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

    // Sort entries by createdAt in descending order (latest first)
    const sortedMemo = {
      ...memo.toObject(),
      creditEntries: memo.creditEntries.sort((a, b) => new Date(b.createdAt || b._id.getTimestamp()) - new Date(a.createdAt || a._id.getTimestamp())),
      debitEntries: memo.debitEntries.sort((a, b) => new Date(b.createdAt || b._id.getTimestamp()) - new Date(a.createdAt || a._id.getTimestamp()))
    };

    sendSuccess(res, { memo: sortedMemo }, 'Daily cash memo retrieved successfully');
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

/**
 * Add credit entry to daily cash memo
 */
export const addCreditEntry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, amount, account, customer, paymentMethod = 'cash' } = req.body;

    // Validate required fields
    if (!name || !amount || !account) {
      throw new ValidationError('Name, amount, and account are required for credit entries');
    }

    // Find or create daily cash memo
    const targetDate = new Date();
    targetDate.setHours(0, 0, 0, 0);
    
    let memo = await DailyCashMemo.findOne({
      date: { $gte: targetDate, $lte: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000 - 1) }
    });

    if (!memo) {
      // Create new memo for today
      const previousBalance = await getPreviousDayClosingBalance(targetDate);
      memo = await DailyCashMemo.create({
        date: targetDate,
        openingBalance: previousBalance,
        createdBy: req.user.id
      });
    }

    // Create credit entry
    const creditEntry = {
      name,
      description: description || '',
      amount: parseFloat(amount),
      account,
      customer: customer || null,
      paymentMethod,
      entryType: ENTRY_TYPES.CREDIT,
      createdAt: new Date()
    };

    // Create payment record for audit trail
    const payment = await Payment.create({
      type: 'receipt',
      date: new Date(),
      description: `Credit entry: ${name}`,
      amount: parseFloat(amount),
      paymentMethod,
      toAccount: account,
      customer: customer || null,
      receivedFrom: name,
      status: 'posted',
      createdBy: req.user.id
    });

    creditEntry.paymentReference = payment._id;

    // Add to memo
    memo.creditEntries.push(creditEntry);
    memo.updatedBy = req.user.id;
    
    // Save and populate in one operation
    await memo.save();
    await memo.populate([
      { path: 'creditEntries.account', select: 'name code' },
      { path: 'creditEntries.customer', select: 'name' },
      { path: 'createdBy', select: 'name email' }
    ]);

    sendSuccess(res, { memo, entry: creditEntry }, 'Credit entry added successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Add debit entry to daily cash memo
 */
export const addDebitEntry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, amount, category, mazdoor, supplier, paymentMethod = 'cash' } = req.body;

    // Validate required fields
    if (!name || !amount || !category) {
      throw new ValidationError('Name, amount, and category are required for debit entries');
    }

    // Find or create daily cash memo
    const targetDate = new Date();
    targetDate.setHours(0, 0, 0, 0);
    
    let memo = await DailyCashMemo.findOne({
      date: { $gte: targetDate, $lte: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000 - 1) }
    });

    if (!memo) {
      // Create new memo for today
      const previousBalance = await getPreviousDayClosingBalance(targetDate);
      memo = await DailyCashMemo.create({
        date: targetDate,
        openingBalance: previousBalance,
        createdBy: req.user.id
      });
    }

    // Create debit entry
    const debitEntry = {
      name,
      description: description || '',
      amount: parseFloat(amount),
      category,
      mazdoor: mazdoor || null,
      supplier: supplier || null,
      paymentMethod,
      entryType: ENTRY_TYPES.DEBIT,
      createdAt: new Date()
    };

    // Get default cash account for payments
    const cashAccount = await Account.findOne({ isCashAccount: true });
    if (!cashAccount) {
      throw new ValidationError('No cash account found. Please set up a cash account first.');
    }

    // Create payment record
    const payment = await Payment.create({
      type: 'payment',
      date: new Date(),
      description: `Debit entry: ${name}`,
      amount: parseFloat(amount),
      paymentMethod,
      fromAccount: cashAccount._id,
      mazdoor: mazdoor || null,
      supplier: supplier || null,
      category,
      paidTo: name,
      status: 'posted',
      createdBy: req.user.id
    });

    debitEntry.paymentReference = payment._id;

    // Create expense record for mazdoor payments or general expenses
    if (category === 'mazdoor' || ['electricity', 'rent', 'transport', 'maintenance', 'other'].includes(category)) {
      console.log('Creating expense for category:', category, 'with amount:', amount);
      
      const expense = await Expense.create({
        category,
        description: description || `Debit entry: ${name}`, // Ensure description is never empty
        amount: parseFloat(amount),
        date: new Date(),
        paymentMethod,
        mazdoor: mazdoor || null,
        supplier: supplier || null,
        createdBy: req.user.id
      });

      console.log('Expense created with ID:', expense._id);
      debitEntry.expenseReference = expense._id;
    } else {
      console.log('Not creating expense for category:', category);
    }

    // Add to memo
    memo.debitEntries.push(debitEntry);
    memo.updatedBy = req.user.id;
    
    // Save and populate in one operation
    await memo.save();
    await memo.populate([
      { path: 'debitEntries.mazdoor', select: 'name' },
      { path: 'debitEntries.supplier', select: 'name' },
      { path: 'createdBy', select: 'name email' }
    ]);

    sendSuccess(res, { memo, entry: debitEntry }, 'Debit entry added successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Helper function to get previous day's closing balance
 */
async function getPreviousDayClosingBalance(currentDate) {
  const previousDate = new Date(currentDate);
  previousDate.setDate(previousDate.getDate() - 1);
  previousDate.setHours(23, 59, 59, 999);

  const previousMemo = await DailyCashMemo.findOne({
    date: { $lte: previousDate }
  }).sort({ date: -1 }).limit(1);

  return previousMemo?.closingBalance || 0;
}

/**
 * Get accounts for dropdown
 */
export const getAccounts = async (req, res, next) => {
  try {
    const accounts = await Account.find({ isActive: true })
      .select('name code type isCashAccount isBankAccount')
      .sort({ code: 1 });

    sendSuccess(res, { accounts }, 'Accounts retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Post daily cash memo (finalize for the day)
 */
export const postDailyCashMemo = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const memo = await DailyCashMemo.findById(id);
    if (!memo) {
      throw new NotFoundError('Daily cash memo');
    }

    if (memo.status === 'posted') {
      throw new ValidationError('Daily cash memo is already posted');
    }

    memo.status = 'posted';
    memo.postedAt = new Date();
    memo.postedBy = req.user.id;
    memo.updatedBy = req.user.id;

    await memo.save();
    await memo.populate('postedBy', 'name email');

    sendSuccess(res, { memo }, 'Daily cash memo posted successfully');
  } catch (error) {
    next(error);
  }
};

