import mongoose from 'mongoose'
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
 * Get supplier transaction history with server-side pagination and advanced filtering
 */
export const getSupplierTransactionHistory = async (req, res, next) => {
  try {
    const { supplierId } = req.params;
    const {
      page = 1,
      limit = 20,
      startDate,
      endDate,
      transactionType,
      source,
      minAmount,
      maxAmount,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Check if supplier exists
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      throw new NotFoundError('Supplier');
    }

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.$gte = startDate ? new Date(startDate) : new Date('1900-01-01');
      dateFilter.$lte = endDate ? new Date(endDate + 'T23:59:59.999Z') : new Date();
    }

    // Build amount filter
    const amountFilter = {};
    if (minAmount) amountFilter.$gte = parseFloat(minAmount);
    if (maxAmount) amountFilter.$lte = parseFloat(maxAmount);

    // Aggregation pipeline for efficient server-side pagination
    const transactions = await DailyCashMemo.aggregate([
      {
        $match: {
          'debitEntries.supplier': new mongoose.Types.ObjectId(supplierId),
          ...(startDate || endDate ? {
            $or: [
              { date: dateFilter },
              { 'debitEntries.createdAt': dateFilter }
            ]
          } : {})
        }
      },
      { $unwind: '$debitEntries' },
      {
        $match: {
          'debitEntries.supplier': new mongoose.Types.ObjectId(supplierId),
          ...(transactionType ? { 'debitEntries.entryType': transactionType } : {}),
          ...(Object.keys(amountFilter).length > 0 ? { 'debitEntries.amount': amountFilter } : {})
        }
      },
      {
        $lookup: {
          from: 'suppliers',
          localField: 'debitEntries.supplier',
          foreignField: '_id',
          as: 'debitEntries.supplier'
        }
      },
      { $unwind: '$debitEntries.supplier' },
      {
        $project: {
          date: { $ifNull: ['$debitEntries.createdAt', '$date'] },
          type: { $literal: 'debit' },
          description: { $ifNull: ['$debitEntries.description', '$debitEntries.name'] },
          amount: '$debitEntries.amount',
          paymentMethod: '$debitEntries.paymentMethod',
          reference: '$debitEntries.paymentReference',
          source: { $literal: 'Daily Cash Memo' },
          category: '$debitEntries.category',
          supplier: '$debitEntries.supplier',
          memoId: '$_id',
          entryId: '$debitEntries._id',
          createdAt: '$debitEntries.createdAt'
        }
      },
      {
        $unionWith: {
          coll: 'payments',
          pipeline: [
            {
              $match: {
                supplier: new mongoose.Types.ObjectId(supplierId),
                ...(startDate || endDate ? { createdAt: dateFilter } : {}),
                ...(transactionType ? { type: transactionType === 'debit' ? 'payment' : 'receipt' } : {}),
                ...(Object.keys(amountFilter).length > 0 ? { amount: amountFilter } : {}),
                ...(source ? { source: source } : {})
              }
            },
            {
              $lookup: {
                from: 'suppliers',
                localField: 'supplier',
                foreignField: '_id',
                as: 'supplier'
              }
            },
            { $unwind: '$supplier' },
            {
              $project: {
                date: '$createdAt',
                type: { $cond: [{ $eq: ['$type', 'payment'] }, 'debit', 'credit'] },
                description: { $ifNull: ['$description', { $ifNull: ['$paidTo', '$receivedFrom'] }] },
                amount: '$amount',
                paymentMethod: '$paymentMethod',
                reference: '$_id',
                source: { $ifNull: ['$source', 'Payment'] },
                supplier: '$supplier',
                paymentId: '$_id',
                createdAt: '$createdAt'
              }
            }
          ]
        }
      },
      {
        $unionWith: {
          coll: 'expenses',
          pipeline: [
            {
              $match: {
                supplier: new mongoose.Types.ObjectId(supplierId),
                ...(startDate || endDate ? { createdAt: dateFilter } : {}),
                ...(Object.keys(amountFilter).length > 0 ? { amount: amountFilter } : {}),
                ...(source ? { source: 'Expense' } : {})
              }
            },
            {
              $lookup: {
                from: 'suppliers',
                localField: 'supplier',
                foreignField: '_id',
                as: 'supplier'
              }
            },
            { $unwind: '$supplier' },
            {
              $project: {
                date: '$createdAt',
                type: { $literal: 'debit' },
                description: '$description',
                amount: '$amount',
                paymentMethod: '$paymentMethod',
                reference: '$_id',
                source: { $literal: 'Expense' },
                category: '$category',
                supplier: '$supplier',
                expenseId: '$_id',
                createdAt: '$createdAt'
              }
            }
          ]
        }
      },
      {
        $match: {
          ...(Object.keys(source || {}).length > 0 ? source : {})
        }
      },
      {
        $sort: {
          [sortBy]: sortOrder === 'desc' ? -1 : 1
        }
      },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: parseInt(limit) }],
          totalCount: [{ $count: 'count' }]
        }
      }
    ]);

    const paginatedTransactions = transactions[0].data;
    const total = transactions[0].totalCount[0]?.count || 0;

    sendPaginated(res, paginatedTransactions, { 
      page: parseInt(page), 
      limit: parseInt(limit), 
      total,
      totalPages: Math.ceil(total / parseInt(limit))
    }, 'Supplier transaction history retrieved successfully');
  } catch (error) {
    next(error);
  }
};
