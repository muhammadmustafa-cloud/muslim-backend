import Stock from '../models/Stock.model.js';
import Item from '../models/Item.model.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { INVENTORY_OPERATIONS } from '../utils/constants.js';

/**
 * Get all stock transactions with pagination
 */
export const getStockTransactions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const item = req.query.item;
    const operation = req.query.operation;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    // Build query
    const query = {};
    if (item) {
      query.item = item;
    }
    if (operation) {
      query.operation = operation;
    }
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Get stock transactions
    const transactions = await Stock.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('item', 'name code unit')
      .populate('reference')
      .populate('createdBy', 'name email');

    const total = await Stock.countDocuments(query);

    sendPaginated(res, transactions, { page, limit, total }, 'Stock transactions retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Stock In - Add stock to inventory
 */
export const stockIn = async (req, res, next) => {
  try {
    const { item, quantity, rate, reference, referenceType, reason, notes, date } = req.body;

    // Check if item exists
    const itemDoc = await Item.findById(item);
    if (!itemDoc) {
      throw new NotFoundError('Item');
    }

    const previousStock = itemDoc.currentStock;
    const newStock = previousStock + quantity;

    // Update item stock
    itemDoc.currentStock = newStock;
    await itemDoc.save();

    // Create stock transaction
    const stockTransaction = await Stock.create({
      item,
      operation: INVENTORY_OPERATIONS.IN,
      quantity,
      previousStock,
      newStock,
      rate: rate || 0,
      totalAmount: (rate || 0) * quantity,
      reference,
      referenceType,
      reason,
      notes,
      date: date || new Date(),
      createdBy: req.user.id
    });

    await stockTransaction.populate('item', 'name code unit');
    await stockTransaction.populate('reference');

    sendSuccess(res, { transaction: stockTransaction }, 'Stock added successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Stock Out - Remove stock from inventory
 */
export const stockOut = async (req, res, next) => {
  try {
    const { item, quantity, rate, reference, referenceType, reason, notes, date } = req.body;

    // Check if item exists
    const itemDoc = await Item.findById(item);
    if (!itemDoc) {
      throw new NotFoundError('Item');
    }

    // Check if sufficient stock is available
    if (itemDoc.currentStock < quantity) {
      throw new ValidationError('Insufficient stock available');
    }

    const previousStock = itemDoc.currentStock;
    const newStock = previousStock - quantity;

    // Update item stock
    itemDoc.currentStock = newStock;
    await itemDoc.save();

    // Create stock transaction
    const stockTransaction = await Stock.create({
      item,
      operation: INVENTORY_OPERATIONS.OUT,
      quantity,
      previousStock,
      newStock,
      rate: rate || 0,
      totalAmount: (rate || 0) * quantity,
      reference,
      referenceType,
      reason,
      notes,
      date: date || new Date(),
      createdBy: req.user.id
    });

    await stockTransaction.populate('item', 'name code unit');
    await stockTransaction.populate('reference');

    sendSuccess(res, { transaction: stockTransaction }, 'Stock removed successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Stock Adjustment - Adjust stock manually
 */
export const stockAdjustment = async (req, res, next) => {
  try {
    const { item, quantity, reason, notes, date } = req.body;

    // Check if item exists
    const itemDoc = await Item.findById(item);
    if (!itemDoc) {
      throw new NotFoundError('Item');
    }

    const previousStock = itemDoc.currentStock;
    const newStock = quantity; // Set to new quantity

    // Update item stock
    itemDoc.currentStock = newStock;
    await itemDoc.save();

    // Determine operation type
    const operation = newStock > previousStock ? INVENTORY_OPERATIONS.IN : INVENTORY_OPERATIONS.OUT;
    const qty = Math.abs(newStock - previousStock);

    // Create stock transaction
    const stockTransaction = await Stock.create({
      item,
      operation: INVENTORY_OPERATIONS.ADJUSTMENT,
      quantity: qty,
      previousStock,
      newStock,
      rate: 0,
      totalAmount: 0,
      reason: reason || 'Stock adjustment',
      notes,
      date: date || new Date(),
      createdBy: req.user.id
    });

    await stockTransaction.populate('item', 'name code unit');

    sendSuccess(res, { transaction: stockTransaction }, 'Stock adjusted successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Get stock summary for an item
 */
export const getStockSummary = async (req, res, next) => {
  try {
    const itemId = req.params.itemId;

    const item = await Item.findById(itemId);
    if (!item) {
      throw new NotFoundError('Item');
    }

    // Get stock transactions
    const transactions = await Stock.find({ item: itemId })
      .sort({ date: -1 })
      .limit(50)
      .populate('createdBy', 'name email');

    sendSuccess(res, { item, transactions }, 'Stock summary retrieved successfully');
  } catch (error) {
    next(error);
  }
};

