import Supplier from '../models/Supplier.model.js';
import DailyCashMemo from '../models/DailyCashMemo.model.js';
import Payment from '../models/Payment.model.js';
import Expense from '../models/Expense.model.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';
import { NotFoundError } from '../utils/errors.js';

/**
 * Get all suppliers with pagination
 */
export const getSuppliers = async (req, res, next) => {
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
        { phone: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }
    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    // Get suppliers
    const suppliers = await Supplier.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    const total = await Supplier.countDocuments(query);

    sendPaginated(res, suppliers, { page, limit, total }, 'Suppliers retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get single supplier by ID
 */
export const getSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!supplier) {
      throw new NotFoundError('Supplier');
    }

    sendSuccess(res, { supplier }, 'Supplier retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create new supplier
 */
export const createSupplier = async (req, res, next) => {
  try {
    const supplierData = {
      ...req.body,
      createdBy: req.user.id
    };

    const supplier = await Supplier.create(supplierData);
    await supplier.populate('createdBy', 'name email');

    sendSuccess(res, { supplier }, 'Supplier created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update supplier
 */
export const updateSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      throw new NotFoundError('Supplier');
    }

    Object.assign(supplier, req.body);
    supplier.updatedBy = req.user.id;
    await supplier.save();
    await supplier.populate('updatedBy', 'name email');

    sendSuccess(res, { supplier }, 'Supplier updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete supplier (soft delete)
 */
export const deleteSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      throw new NotFoundError('Supplier');
    }

    supplier.isActive = false;
    supplier.updatedBy = req.user.id;
    await supplier.save();

    sendSuccess(res, null, 'Supplier deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get supplier transaction history
 */
export const getSupplierTransactionHistory = async (req, res, next) => {
  try {
    const { supplierId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Check if supplier exists
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      throw new NotFoundError('Supplier');
    }

    // Get all transactions related to this supplier
    const transactions = [];

    // 1. Get debit entries from Daily Cash Memo
    const debitMemos = await DailyCashMemo.find({
      'debitEntries.supplier': supplierId
    }).populate('debitEntries.supplier');

    debitMemos.forEach(memo => {
      memo.debitEntries.forEach(entry => {
        if (entry.supplier && entry.supplier._id.toString() === supplierId) {
          transactions.push({
            date: entry.createdAt || memo.date,
            type: 'debit',
            description: entry.description || entry.name,
            amount: entry.amount,
            paymentMethod: entry.paymentMethod,
            reference: entry.paymentReference,
            source: 'Daily Cash Memo',
            category: entry.category,
            supplier: entry.supplier, // Add supplier object
            memoId: memo._id,
            entryId: entry._id
          });
        }
      });
    });

    // 2. Get payments where supplier is the receiver
    const payments = await Payment.find({
      supplier: supplierId
    }).populate('supplier');

    payments.forEach(payment => {
      transactions.push({
        date: payment.createdAt,
        type: payment.type === 'payment' ? 'debit' : 'credit',
        description: payment.description || payment.paidTo || payment.receivedFrom,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        reference: payment._id,
        source: 'Payment',
        supplier: payment.supplier, // Add supplier object
        paymentId: payment._id
      });
    });

    // 3. Get expenses where supplier is mentioned
    const expenses = await Expense.find({
      supplier: supplierId
    }).populate('supplier');

    expenses.forEach(expense => {
      transactions.push({
        date: expense.createdAt,
        type: 'debit',
        description: expense.description,
        amount: expense.amount,
        paymentMethod: expense.paymentMethod,
        reference: expense._id,
        source: 'Expense',
        category: expense.category,
        supplier: expense.supplier, // Add supplier object
        expenseId: expense._id
      });
    });

    // Sort transactions by date (newest first)
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Apply pagination
    const paginatedTransactions = transactions.slice(skip, skip + limit);
    const total = transactions.length;

    sendPaginated(res, paginatedTransactions, { page, limit, total }, 'Supplier transaction history retrieved successfully');
  } catch (error) {
    next(error);
  }
};

