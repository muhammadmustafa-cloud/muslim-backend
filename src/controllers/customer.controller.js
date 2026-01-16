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
 * Get customer transaction history
 */
export const getCustomerTransactionHistory = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Check if customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      throw new NotFoundError('Customer');
    }

    // Get all transactions related to this customer
    const transactions = [];

    // 1. Get credit entries from Daily Cash Memo
    const creditMemos = await DailyCashMemo.find({
      'creditEntries.customer': customerId
    }).populate('creditEntries.customer');

    creditMemos.forEach(memo => {
      memo.creditEntries.forEach(entry => {
        if (entry.customer && entry.customer._id.toString() === customerId) {
          transactions.push({
            date: entry.createdAt || memo.date,
            type: 'credit',
            description: entry.description || entry.name,
            amount: entry.amount,
            paymentMethod: entry.paymentMethod,
            reference: entry.paymentReference,
            source: 'Daily Cash Memo',
            customer: entry.customer, // Add customer object
            memoId: memo._id,
            entryId: entry._id
          });
        }
      });
    });

    // 2. Get payments where customer is the receiver
    const payments = await Payment.find({
      customer: customerId
    }).populate('customer');

    payments.forEach(payment => {
      transactions.push({
        date: payment.createdAt,
        type: payment.type === 'receipt' ? 'credit' : 'debit',
        description: payment.description || payment.receivedFrom || payment.paidTo,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        reference: payment._id,
        source: 'Payment',
        customer: payment.customer, // Add customer object
        paymentId: payment._id
      });
    });

    // Sort transactions by date (newest first)
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Apply pagination
    const paginatedTransactions = transactions.slice(skip, skip + limit);
    const total = transactions.length;

    sendPaginated(res, paginatedTransactions, { page, limit, total }, 'Customer transaction history retrieved successfully');
  } catch (error) {
    next(error);
  }
};

