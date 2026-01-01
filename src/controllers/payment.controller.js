import Payment from '../models/Payment.model.js';
import Account from '../models/Account.model.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';
import { NotFoundError } from '../utils/errors.js';

/**
 * Get all payments/receipts with pagination
 */
export const getPayments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const type = req.query.type;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const paymentMethod = req.query.paymentMethod;
    const category = req.query.category;
    const status = req.query.status;
    const search = req.query.search;

    // Build query
    const query = {};
    if (type) {
      query.type = type;
    }
    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }
    if (category) {
      query.category = category;
    }
    if (status) {
      query.status = status;
    }
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    if (search) {
      query.$or = [
        { voucherNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { paidTo: { $regex: search, $options: 'i' } },
        { receivedFrom: { $regex: search, $options: 'i' } }
      ];
    }

    // Get payments
    const payments = await Payment.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('fromAccount', 'name code')
      .populate('toAccount', 'name code')
      .populate('mazdoor', 'name phone')
      .populate('customer', 'name phone')
      .populate('supplier', 'name phone')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    const total = await Payment.countDocuments(query);

    // Calculate totals
    const allPayments = await Payment.find({ ...query, type: 'payment', status: 'posted' });
    const allReceipts = await Payment.find({ ...query, type: 'receipt', status: 'posted' });
    
    const totalPayments = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalReceipts = allReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);
    const cashPayments = allPayments.filter(p => p.paymentMethod === 'cash').length;
    const chequePayments = allPayments.filter(p => p.paymentMethod === 'cheque').length;

    sendPaginated(
      res,
      payments,
      { 
        page, 
        limit, 
        total,
        totalPayments,
        totalReceipts,
        cashPayments,
        chequePayments
      },
      'Payments retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get single payment/receipt by ID
 */
export const getPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('fromAccount', 'name code')
      .populate('toAccount', 'name code')
      .populate('mazdoor', 'name phone')
      .populate('customer', 'name phone')
      .populate('supplier', 'name phone')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!payment) {
      throw new NotFoundError('Payment');
    }

    sendSuccess(res, { payment }, 'Payment retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create new payment/receipt
 */
export const createPayment = async (req, res, next) => {
  try {
    // Verify account exists
    if (req.body.type === 'payment' && req.body.fromAccount) {
      const account = await Account.findById(req.body.fromAccount);
      if (!account) {
        return res.status(400).json({
          status: 'error',
          message: 'From account not found'
        });
      }
      if (!account.isActive) {
        return res.status(400).json({
          status: 'error',
          message: 'From account is not active'
        });
      }
    }
    
    if (req.body.type === 'receipt' && req.body.toAccount) {
      const account = await Account.findById(req.body.toAccount);
      if (!account) {
        return res.status(400).json({
          status: 'error',
          message: 'To account not found'
        });
      }
      if (!account.isActive) {
        return res.status(400).json({
          status: 'error',
          message: 'To account is not active'
        });
      }
    }

    const paymentData = {
      ...req.body,
      date: req.body.date || new Date(),
      createdBy: req.user.id
    };

    const payment = await Payment.create(paymentData);
    await payment.populate('fromAccount', 'name code');
    await payment.populate('toAccount', 'name code');
    await payment.populate('mazdoor', 'name phone');
    await payment.populate('customer', 'name phone');
    await payment.populate('supplier', 'name phone');
    await payment.populate('createdBy', 'name email');

    sendSuccess(res, { payment }, 'Payment created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update payment/receipt
 */
export const updatePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      throw new NotFoundError('Payment');
    }

    // Don't allow changing type or account after creation
    delete req.body.type;
    delete req.body.fromAccount;
    delete req.body.toAccount;

    // Handle account balance updates
    const oldAmount = payment.amount;
    const newAmount = req.body.amount || payment.amount;
    const oldStatus = payment.status;
    const newStatus = req.body.status || payment.status;

    // If amount or status changed and payment was posted, reverse old balance
    if (oldStatus === 'posted' && (oldAmount !== newAmount || oldStatus !== newStatus)) {
      if (payment.type === 'payment' && payment.fromAccount) {
        await Account.findByIdAndUpdate(
          payment.fromAccount,
          { $inc: { currentBalance: oldAmount } }
        );
      } else if (payment.type === 'receipt' && payment.toAccount) {
        await Account.findByIdAndUpdate(
          payment.toAccount,
          { $inc: { currentBalance: -oldAmount } }
        );
      }
    }

    // Apply new balance change if status is posted
    if (newStatus === 'posted' && (oldAmount !== newAmount || oldStatus !== newStatus)) {
      if (payment.type === 'payment' && payment.fromAccount) {
        await Account.findByIdAndUpdate(
          payment.fromAccount,
          { $inc: { currentBalance: -newAmount } }
        );
      } else if (payment.type === 'receipt' && payment.toAccount) {
        await Account.findByIdAndUpdate(
          payment.toAccount,
          { $inc: { currentBalance: newAmount } }
        );
      }
    }

    Object.assign(payment, req.body);
    payment.updatedBy = req.user.id;
    await payment.save();
    await payment.populate('fromAccount', 'name code');
    await payment.populate('toAccount', 'name code');
    await payment.populate('mazdoor', 'name phone');
    await payment.populate('customer', 'name phone');
    await payment.populate('supplier', 'name phone');
    await payment.populate('updatedBy', 'name email');

    sendSuccess(res, { payment }, 'Payment updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete payment/receipt
 */
export const deletePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      throw new NotFoundError('Payment');
    }

    // Reverse account balance if payment was posted
    if (payment.status === 'posted') {
      if (payment.type === 'payment' && payment.fromAccount) {
        await Account.findByIdAndUpdate(
          payment.fromAccount,
          { $inc: { currentBalance: payment.amount } }
        );
      } else if (payment.type === 'receipt' && payment.toAccount) {
        await Account.findByIdAndUpdate(
          payment.toAccount,
          { $inc: { currentBalance: -payment.amount } }
        );
      }
    }

    await payment.deleteOne();

    sendSuccess(res, null, 'Payment deleted successfully');
  } catch (error) {
    next(error);
  }
};

