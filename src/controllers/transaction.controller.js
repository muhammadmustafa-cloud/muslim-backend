import Transaction from '../models/Transaction.model.js';
import Stock from '../models/Stock.model.js';
import Item from '../models/Item.model.js';
import Customer from '../models/Customer.model.js';
import Supplier from '../models/Supplier.model.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { TRANSACTION_TYPES, PAYMENT_STATUS, INVENTORY_OPERATIONS } from '../utils/constants.js';

/**
 * Get all transactions with pagination
 */
export const getTransactions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const type = req.query.type;
    const customer = req.query.customer;
    const supplier = req.query.supplier;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const paymentStatus = req.query.paymentStatus;

    // Build query
    const query = { isActive: true };
    if (type) {
      query.type = type;
    }
    if (customer) {
      query.customer = customer;
    }
    if (supplier) {
      query.supplier = supplier;
    }
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Get transactions
    const transactions = await Transaction.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('customer', 'name phone')
      .populate('supplier', 'name phone')
      .populate('items.item', 'name code unit')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    const total = await Transaction.countDocuments(query);

    sendPaginated(res, transactions, { page, limit, total }, 'Transactions retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get single transaction by ID
 */
export const getTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('customer', 'name phone address')
      .populate('supplier', 'name phone address')
      .populate('items.item', 'name code unit purchasePrice sellingPrice')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!transaction) {
      throw new NotFoundError('Transaction');
    }

    sendSuccess(res, { transaction }, 'Transaction retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create new transaction (Purchase or Sale)
 */
export const createTransaction = async (req, res, next) => {
  try {
    const { type, customer, supplier, items, subtotal, discount, tax, total, paidAmount, paymentMethod, date, notes } = req.body;

    // Validate type
    if (![TRANSACTION_TYPES.PURCHASE, TRANSACTION_TYPES.SALE].includes(type)) {
      throw new ValidationError('Transaction type must be purchase or sale');
    }

    // Validate customer/supplier
    if (type === TRANSACTION_TYPES.SALE && !customer) {
      throw new ValidationError('Customer is required for sale transaction');
    }
    if (type === TRANSACTION_TYPES.PURCHASE && !supplier) {
      throw new ValidationError('Supplier is required for purchase transaction');
    }

    // Validate items
    if (!items || items.length === 0) {
      throw new ValidationError('At least one item is required');
    }

    // Calculate totals if not provided
    let calculatedSubtotal = 0;
    if (items) {
      calculatedSubtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    }
    const finalSubtotal = subtotal || calculatedSubtotal;
    const finalDiscount = discount || 0;
    const finalTax = tax || 0;
    const finalTotal = total || (finalSubtotal - finalDiscount + finalTax);
    const finalPaidAmount = paidAmount || 0;

    // Create transaction
    const transaction = await Transaction.create({
      type,
      customer: type === TRANSACTION_TYPES.SALE ? customer : null,
      supplier: type === TRANSACTION_TYPES.PURCHASE ? supplier : null,
      items: items.map(item => ({
        item: item.item,
        quantity: item.quantity,
        rate: item.rate,
        total: item.quantity * item.rate
      })),
      subtotal: finalSubtotal,
      discount: finalDiscount,
      tax: finalTax,
      total: finalTotal,
      paidAmount: finalPaidAmount,
      paymentMethod: paymentMethod || 'cash',
      date: date || new Date(),
      notes,
      createdBy: req.user.id
    });

    // Update stock for each item
    for (const item of items) {
      const itemDoc = await Item.findById(item.item);
      if (!itemDoc) continue;

      if (type === TRANSACTION_TYPES.PURCHASE) {
        // Stock IN
        itemDoc.currentStock += item.quantity;
        await itemDoc.save();

        await Stock.create({
          item: item.item,
          operation: INVENTORY_OPERATIONS.IN,
          quantity: item.quantity,
          previousStock: itemDoc.currentStock - item.quantity,
          newStock: itemDoc.currentStock,
          rate: item.rate,
          totalAmount: item.quantity * item.rate,
          reference: transaction._id,
          referenceType: 'Transaction',
          date: date || new Date(),
          createdBy: req.user.id
        });
      } else if (type === TRANSACTION_TYPES.SALE) {
        // Stock OUT - Check availability first
        if (itemDoc.currentStock < item.quantity) {
          throw new ValidationError(`Insufficient stock for item: ${itemDoc.name}`);
        }

        itemDoc.currentStock -= item.quantity;
        await itemDoc.save();

        await Stock.create({
          item: item.item,
          operation: INVENTORY_OPERATIONS.OUT,
          quantity: item.quantity,
          previousStock: itemDoc.currentStock + item.quantity,
          newStock: itemDoc.currentStock,
          rate: item.rate,
          totalAmount: item.quantity * item.rate,
          reference: transaction._id,
          referenceType: 'Transaction',
          date: date || new Date(),
          createdBy: req.user.id
        });
      }
    }

    // Update customer/supplier balance
    if (type === TRANSACTION_TYPES.SALE && customer) {
      const customerDoc = await Customer.findById(customer);
      if (customerDoc) {
        customerDoc.currentBalance += (finalTotal - finalPaidAmount);
        await customerDoc.save();
      }
    } else if (type === TRANSACTION_TYPES.PURCHASE && supplier) {
      const supplierDoc = await Supplier.findById(supplier);
      if (supplierDoc) {
        supplierDoc.currentBalance += (finalTotal - finalPaidAmount);
        await supplierDoc.save();
      }
    }

    await transaction.populate('customer', 'name phone');
    await transaction.populate('supplier', 'name phone');
    await transaction.populate('items.item', 'name code unit');

    sendSuccess(res, { transaction }, 'Transaction created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update transaction payment
 */
export const updateTransactionPayment = async (req, res, next) => {
  try {
    const { paidAmount, paymentMethod } = req.body;

    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      throw new NotFoundError('Transaction');
    }

    const previousPaid = transaction.paidAmount;
    transaction.paidAmount = paidAmount;
    if (paymentMethod) {
      transaction.paymentMethod = paymentMethod;
    }
    transaction.updatedBy = req.user.id;
    await transaction.save();

    // Update customer/supplier balance
    const difference = paidAmount - previousPaid;
    if (transaction.type === TRANSACTION_TYPES.SALE && transaction.customer) {
      const customer = await Customer.findById(transaction.customer);
      if (customer) {
        customer.currentBalance -= difference;
        await customer.save();
      }
    } else if (transaction.type === TRANSACTION_TYPES.PURCHASE && transaction.supplier) {
      const supplier = await Supplier.findById(transaction.supplier);
      if (supplier) {
        supplier.currentBalance -= difference;
        await supplier.save();
      }
    }

    await transaction.populate('customer', 'name phone');
    await transaction.populate('supplier', 'name phone');

    sendSuccess(res, { transaction }, 'Transaction payment updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete transaction (soft delete)
 */
export const deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      throw new NotFoundError('Transaction');
    }

    // Reverse stock changes
    if (transaction.items && transaction.items.length > 0) {
      for (const item of transaction.items) {
        const itemDoc = await Item.findById(item.item);
        if (!itemDoc) continue;

        if (transaction.type === TRANSACTION_TYPES.PURCHASE) {
          itemDoc.currentStock -= item.quantity;
        } else if (transaction.type === TRANSACTION_TYPES.SALE) {
          itemDoc.currentStock += item.quantity;
        }
        await itemDoc.save();
      }
    }

    // Reverse balance changes
    if (transaction.type === TRANSACTION_TYPES.SALE && transaction.customer) {
      const customer = await Customer.findById(transaction.customer);
      if (customer) {
        customer.currentBalance -= (transaction.total - transaction.paidAmount);
        await customer.save();
      }
    } else if (transaction.type === TRANSACTION_TYPES.PURCHASE && transaction.supplier) {
      const supplier = await Supplier.findById(transaction.supplier);
      if (supplier) {
        supplier.currentBalance -= (transaction.total - transaction.paidAmount);
        await supplier.save();
      }
    }

    transaction.isActive = false;
    transaction.updatedBy = req.user.id;
    await transaction.save();

    sendSuccess(res, null, 'Transaction deleted successfully');
  } catch (error) {
    next(error);
  }
};

