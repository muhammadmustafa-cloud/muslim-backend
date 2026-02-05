import DailyCashMemo from '../models/DailyCashMemo.model.js';
import Payment from '../models/Payment.model.js';
import Expense from '../models/Expense.model.js';
import Account from '../models/Account.model.js';
import Mazdoor from '../models/Mazdoor.model.js';
import Customer from '../models/Customer.model.js';
import Supplier from '../models/Supplier.model.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { ENTRY_TYPES } from '../utils/constants.js';

// Map Daily Cash Memo paymentMethod to Expense model (Expense uses 'bank' not 'bank_transfer')
function expensePaymentMethod(pm) {
  if (pm === 'bank_transfer') return 'bank';
  return pm || 'cash';
}

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
    const { date, creditEntries, debitEntries, previousBalance, openingBalance, notes } = req.body;
    const prevBal = Number(previousBalance) || Number(openingBalance) || 0;

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);
    const existingMemo = await DailyCashMemo.findOne({ date: { $gte: targetDate, $lte: endDate } });
    if (existingMemo) {
      throw new ValidationError('Daily cash memo already exists for this date');
    }

    const memoData = {
      date: targetDate,
      creditEntries: creditEntries || [],
      debitEntries: debitEntries || [],
      previousBalance: prevBal,
      openingBalance: prevBal,
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
    const { name, description, amount, account, customer, paymentMethod = 'cash', receiptType } = req.body;

    // Validate required fields
    if (!name || !amount || !account) {
      throw new ValidationError('Name, amount, and account are required for credit entries');
    }
    const amountNum = parseFloat(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      throw new ValidationError('Amount must be a positive number');
    }
    if (receiptType === 'customer_payment' && !customer) {
      throw new ValidationError('Customer is required when receipt type is Customer Payment');
    }

    // Find memo by ID (from selected date on frontend)
    let memo = await DailyCashMemo.findById(id);
    if (!memo) {
      throw new NotFoundError('Daily cash memo');
    }
    if (memo.status === 'posted') {
      throw new ValidationError('Cannot add entries to a posted memo');
    }

    // Create credit entry
    const creditEntry = {
      name,
      description: description || '',
      amount: amountNum,
      account,
      customer: customer || null,
      paymentMethod,
      receiptType: receiptType || null,
      entryType: ENTRY_TYPES.CREDIT,
      createdAt: new Date()
    };

    // Create payment record for audit trail (same data as Payments page)
    const payment = await Payment.create({
      type: 'receipt',
      date: new Date(),
      description: `Credit entry: ${name}`,
      amount: amountNum,
      paymentMethod,
      toAccount: account,
      customer: customer || null,
      receivedFrom: name,
      status: 'posted',
      source: 'daily_cash_memo',
      createdBy: req.user.id
    });

    creditEntry.paymentReference = payment._id;

    // Update customer balance (receipt from customer = they paid us = reduce receivable)
    if (customer) {
      await Customer.findByIdAndUpdate(customer, { $inc: { currentBalance: -amountNum } });
    }

    // Add to memo
    memo.creditEntries.push(creditEntry);
    memo.updatedBy = req.user.id;
    
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
    const amountNum = parseFloat(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      throw new ValidationError('Amount must be a positive number');
    }
    if (category === 'mazdoor' && !mazdoor) {
      throw new ValidationError('Mazdoor is required when category is Mazdoor');
    }
    if (category === 'supplier_payment' && !supplier) {
      throw new ValidationError('Supplier is required when category is Supplier Payment');
    }

    // Find memo by ID (from selected date on frontend)
    let memo = await DailyCashMemo.findById(id);
    if (!memo) {
      throw new NotFoundError('Daily cash memo');
    }
    if (memo.status === 'posted') {
      throw new ValidationError('Cannot add entries to a posted memo');
    }

    // Create debit entry
    const debitEntry = {
      name,
      description: description || '',
      amount: amountNum,
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

    // Create payment record (same data as Payments page)
    const payment = await Payment.create({
      type: 'payment',
      date: new Date(),
      description: `Debit entry: ${name}`,
      amount: amountNum,
      paymentMethod,
      fromAccount: cashAccount._id,
      mazdoor: mazdoor || null,
      supplier: supplier || null,
      category,
      paidTo: name,
      status: 'posted',
      source: 'daily_cash_memo',
      createdBy: req.user.id
    });

    debitEntry.paymentReference = payment._id;

    // Update mazdoor balance (salary paid = we paid them; reduce advance/balance we track)
    if (category === 'mazdoor' && mazdoor) {
      await Mazdoor.findByIdAndUpdate(mazdoor, { $inc: { currentBalance: -amountNum } });
    }

    // Update supplier balance (we paid supplier = reduce what we owe)
    if ((category === 'supplier_payment' || category === 'raw_material') && supplier) {
      await Supplier.findByIdAndUpdate(supplier, { $inc: { currentBalance: -amountNum } });
    }

    // Create expense record for all expense categories (same data as Expenses page)
    const expenseCategories = ['mazdoor', 'electricity', 'rent', 'transport', 'raw_material', 'maintenance', 'other', 'supplier_payment'];
    if (expenseCategories.includes(category)) {
      const expense = await Expense.create({
        category,
        description: description || `Debit entry: ${name}`,
        amount: amountNum,
        date: new Date(),
        paymentMethod: expensePaymentMethod(paymentMethod),
        mazdoor: mazdoor || null,
        supplier: supplier || null,
        source: 'daily_cash_memo',
        createdBy: req.user.id
      });
      debitEntry.expenseReference = expense._id;
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
 * Get entries report (flattened credit/debit) for date range and optional category
 */
export const getEntriesReport = async (req, res, next) => {
  try {
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const category = req.query.category;
    const mazdoorId = req.query.mazdoorId;   // filter debit entries by specific mazdoor
    const customerId = req.query.customerId; // filter credit entries by specific customer
    const supplierId = req.query.supplierId; // filter debit entries by specific supplier
    const description = (req.query.description || '').trim().toLowerCase(); // filter by description (e.g. "gaari kiraya")

    if (!startDate || !endDate) {
      throw new ValidationError('startDate and endDate are required (YYYY-MM-DD)');
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const memos = await DailyCashMemo.find({
      date: { $gte: start, $lte: end }
    })
      .sort({ date: 1 })
      .populate('creditEntries.account', 'name code')
      .populate('creditEntries.customer', 'name')
      .populate('debitEntries.mazdoor', 'name')
      .populate('debitEntries.supplier', 'name');

    const entries = [];
    let totalCredit = 0;
    let totalDebit = 0;

    const matchDescription = (text) => !description || (text || '').toLowerCase().includes(description);
    const matchMazdoor = (e) => !mazdoorId || (e.mazdoor?._id?.toString() === mazdoorId || e.mazdoor?.toString() === mazdoorId);
    const matchCustomer = (e) => !customerId || (e.customer?._id?.toString() === customerId || e.customer?.toString() === customerId);
    const matchSupplier = (e) => !supplierId || (e.supplier?._id?.toString() === supplierId || e.supplier?.toString() === supplierId);

    for (const memo of memos) {
      const memoDate = memo.date instanceof Date ? memo.date : new Date(memo.date);
      const dateStr = memoDate.toISOString().split('T')[0];

      const creditReceiptTypes = ['customer_payment', 'sale', 'other_income', 'general'];
      if (!category || category === 'credit' || creditReceiptTypes.includes(category)) {
        for (const e of memo.creditEntries || []) {
          const includeCredit = !category || category === 'credit' || e.receiptType === category;
          if (includeCredit && matchCustomer(e) && matchDescription(e.description)) {
            entries.push({
              date: dateStr,
              type: 'credit',
              name: e.name,
              description: e.description || '',
              amount: e.amount,
              category: e.receiptType || null,
              receiptType: e.receiptType || null,
              account: e.account ? `${e.account.code || ''} - ${e.account.name || ''}`.trim() : '',
              customer: e.customer?.name || '',
              customerId: e.customer?._id?.toString() || e.customer?.toString() || null,
              mazdoor: '',
              supplier: '',
              paymentMethod: e.paymentMethod || 'cash',
              memoId: memo._id,
              entryId: e._id,
              createdAt: e.createdAt
            });
            totalCredit += e.amount || 0;
          }
        }
      }

      if (!category || (category !== 'credit' && !creditReceiptTypes.includes(category))) {
        for (const e of memo.debitEntries || []) {
          if (category && e.category !== category) continue;
          if (!matchMazdoor(e) || !matchSupplier(e) || !matchDescription(e.description)) continue;
          entries.push({
            date: dateStr,
            type: 'debit',
            name: e.name,
            description: e.description || '',
            amount: e.amount,
            category: e.category || '',
            account: '',
            customer: '',
            mazdoor: e.mazdoor?.name || '',
            mazdoorId: e.mazdoor?._id?.toString() || e.mazdoor?.toString() || null,
            supplier: e.supplier?.name || '',
            supplierId: e.supplier?._id?.toString() || e.supplier?.toString() || null,
            paymentMethod: e.paymentMethod || 'cash',
            memoId: memo._id,
            entryId: e._id,
            createdAt: e.createdAt
          });
          totalDebit += e.amount || 0;
        }
      }
    }

    // Sort by date then by createdAt within date
    entries.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    });

    sendSuccess(res, {
      entries,
      summary: {
        totalCredit,
        totalDebit,
        closingBalance: totalCredit - totalDebit,
        count: entries.length
      }
    }, 'Entries report retrieved successfully');
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

