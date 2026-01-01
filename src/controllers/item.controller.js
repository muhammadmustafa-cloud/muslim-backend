import Item from '../models/Item.model.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';
import { NotFoundError } from '../utils/errors.js';

/**
 * Get all items with pagination
 */
export const getItems = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const type = req.query.type;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
    const lowStock = req.query.lowStock === 'true';

    // Build query
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }
    if (type) {
      query.type = type;
    }
    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    // Get items
    let items = await Item.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('rawMaterial', 'name code')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    // Filter low stock items
    if (lowStock) {
      items = items.filter(item => item.isLowStock);
    }

    const total = await Item.countDocuments(query);

    sendPaginated(res, items, { page, limit, total }, 'Items retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get single item by ID
 */
export const getItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate('rawMaterial', 'name code')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!item) {
      throw new NotFoundError('Item');
    }

    sendSuccess(res, { item }, 'Item retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create new item
 */
export const createItem = async (req, res, next) => {
  try {
    const itemData = {
      ...req.body,
      createdBy: req.user.id
    };

    const item = await Item.create(itemData);
    await item.populate('createdBy', 'name email');

    sendSuccess(res, { item }, 'Item created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update item
 */
export const updateItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      throw new NotFoundError('Item');
    }

    Object.assign(item, req.body);
    item.updatedBy = req.user.id;
    await item.save();
    await item.populate('updatedBy', 'name email');

    sendSuccess(res, { item }, 'Item updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete item (soft delete)
 */
export const deleteItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      throw new NotFoundError('Item');
    }

    item.isActive = false;
    item.updatedBy = req.user.id;
    await item.save();

    sendSuccess(res, null, 'Item deleted successfully');
  } catch (error) {
    next(error);
  }
};

