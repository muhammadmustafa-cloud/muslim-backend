import mongoose from 'mongoose'
import Customer from '../models/Customer.model.js';
import DailyCashMemo from '../models/DailyCashMemo.model.js';
import Payment from '../models/Payment.model.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';
import { NotFoundError } from '../utils/errors.js';

/**
 * Get all customers with pagination
 */
export const getCustomers = async (req, res, next) => {
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

    // Get customers
    const customers = await Customer.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    const total = await Customer.countDocuments(query);

    sendPaginated(res, customers, { page, limit, total }, 'Customers retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get single customer by ID
 */
export const getCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    sendSuccess(res, { customer }, 'Customer retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create new customer
 */
export const createCustomer = async (req, res, next) => {
  try {
    const customerData = {
      ...req.body,
      createdBy: req.user.id
    };

    const customer = await Customer.create(customerData);
    await customer.populate('createdBy', 'name email');

    sendSuccess(res, { customer }, 'Customer created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update customer
 */
export const updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      throw new NotFoundError('Customer');
    }

    Object.assign(customer, req.body);
    customer.updatedBy = req.user.id;
    await customer.save();
    await customer.populate('updatedBy', 'name email');

    sendSuccess(res, { customer }, 'Customer updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete customer (soft delete)
 */
export const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      throw new NotFoundError('Customer');
    }

    customer.isActive = false;
    customer.updatedBy = req.user.id;
    await customer.save();

    sendSuccess(res, null, 'Customer deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get customer transaction history with server-side pagination and advanced filtering
 */
export const getCustomerTransactionHistory = async (req, res, next) => {
  try {
    const { customerId } = req.params;
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

    // Check if customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      throw new NotFoundError('Customer');
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

    // Build transaction type filter
    const typeFilter = transactionType ? { type: transactionType } : {};

    // Build source filter
    const sourceFilter = source ? { source: source } : {};

    // Aggregation pipeline for efficient server-side pagination
    const transactions = await DailyCashMemo.aggregate([
      {
        $match: {
          'creditEntries.customer': new mongoose.Types.ObjectId(customerId),
          ...(startDate || endDate ? {
            $or: [
              { date: dateFilter },
              { 'creditEntries.createdAt': dateFilter }
            ]
          } : {})
        }
      },
      { $unwind: '$creditEntries' },
      {
        $match: {
          'creditEntries.customer': new mongoose.Types.ObjectId(customerId),
          ...(transactionType ? { 'creditEntries.entryType': transactionType } : {}),
          ...(Object.keys(amountFilter).length > 0 ? { 'creditEntries.amount': amountFilter } : {})
        }
      },
      {
        $lookup: {
          from: 'customers',
          localField: 'creditEntries.customer',
          foreignField: '_id',
          as: 'creditEntries.customer'
        }
      },
      { $unwind: '$creditEntries.customer' },
      {
        $project: {
          date: { $ifNull: ['$creditEntries.createdAt', '$date'] },
          type: { $literal: 'credit' },
          description: { $ifNull: ['$creditEntries.description', '$creditEntries.name'] },
          amount: '$creditEntries.amount',
          paymentMethod: '$creditEntries.paymentMethod',
          reference: '$creditEntries.paymentReference',
          source: { $literal: 'Daily Cash Memo' },
          customer: '$creditEntries.customer',
          memoId: '$_id',
          entryId: '$creditEntries._id',
          createdAt: '$creditEntries.createdAt'
        }
      },
      {
        $unionWith: {
          coll: 'payments',
          pipeline: [
            {
              $match: {
                customer: new mongoose.Types.ObjectId(customerId),
                ...(startDate || endDate ? { createdAt: dateFilter } : {}),
                ...(transactionType ? { type: transactionType === 'credit' ? 'receipt' : 'payment' } : {}),
                ...(Object.keys(amountFilter).length > 0 ? { amount: amountFilter } : {}),
                ...(source ? { source: source } : {})
              }
            },
            {
              $lookup: {
                from: 'customers',
                localField: 'customer',
                foreignField: '_id',
                as: 'customer'
              }
            },
            { $unwind: '$customer' },
            {
              $project: {
                date: '$createdAt',
                type: { $cond: [{ $eq: ['$type', 'receipt'] }, 'credit', 'debit'] },
                description: { $ifNull: ['$description', { $ifNull: ['$receivedFrom', '$paidTo'] }] },
                amount: '$amount',
                paymentMethod: '$paymentMethod',
                reference: '$_id',
                source: { $ifNull: ['$source', 'Payment'] },
                customer: '$customer',
                paymentId: '$_id',
                createdAt: '$createdAt'
              }
            }
          ]
        }
      },
      {
        $match: {
          ...(Object.keys(sourceFilter).length > 0 ? sourceFilter : {})
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
    }, 'Customer transaction history retrieved successfully');
  } catch (error) {
    next(error);
  }
};
