import Supplier from '../models/Supplier.model.js';
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

