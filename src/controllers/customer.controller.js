import Customer from '../models/Customer.model.js';
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

