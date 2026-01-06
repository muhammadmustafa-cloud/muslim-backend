import LabourRate from '../models/LabourRate.model.js'
import LabourExpense from '../models/LabourExpense.model.js'
import { sendSuccess, sendPaginated } from '../utils/response.js'
import { NotFoundError, BadRequestError } from '../utils/errors.js'

/**
 * Get all labour rates with pagination, optional search, active filter, and date range
 */
export const getLabourRates = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit
    const search = req.query.search || ''
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined
    const { startDate, endDate } = req.query

    // Build query
    const query = {}
    if (isActive !== undefined) {
      query.isActive = isActive
    }

    // Simple search fallback (search by internal name field)
    if (search) {
      query.name = { $regex: search, $options: 'i' }
    }

    // Date range filtering (default to today if not provided)
    const todayStr = new Date().toISOString().slice(0, 10)
    const effectiveStartStr = startDate || endDate || todayStr
    const effectiveEndStr = endDate || startDate || todayStr

    const start = new Date(effectiveStartStr)
    start.setHours(0, 0, 0, 0)
    const end = new Date(effectiveEndStr)
    end.setHours(23, 59, 59, 999)

    query.createdAt = { $gte: start, $lte: end }

    // Get labour rates
    const labourRates = await LabourRate.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('labourExpense', 'name rate')
      .populate('createdBy', 'name email')

    const total = await LabourRate.countDocuments(query)

    sendPaginated(res, labourRates, { page, limit, total }, 'Labour records retrieved successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Get single labour rate by ID
 */
export const getLabourRate = async (req, res, next) => {
  try {
    const labourRate = await LabourRate.findById(req.params.id)
      .populate('labourExpense', 'name rate')
      .populate('createdBy', 'name email')

    if (!labourRate) {
      throw new NotFoundError('Labour record')
    }

    sendSuccess(res, labourRate, 'Labour record retrieved successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Create new labour rate
 */
export const createLabourRate = async (req, res, next) => {
  try {
    const { labourExpense, bags } = req.body

    // Check if labour expense exists and is active
    const labourExpenseDoc = await LabourExpense.findById(labourExpense)
    if (!labourExpenseDoc) {
      throw new NotFoundError('Labour expense')
    }

    if (!labourExpenseDoc.isActive) {
      throw new BadRequestError('This labour expense is not active')
    }

    // Create labour record with unique name to avoid duplicate key error
    const uniqueName = `labour_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const labourRate = await LabourRate.create({
      labourExpense,
      bags,
      rate: labourExpenseDoc.rate,
      createdBy: req.user.id,
      name: uniqueName,
    })

    const populatedLabourRate = await LabourRate.findById(labourRate._id)
      .populate('labourExpense', 'name rate')
      .populate('createdBy', 'name email')

    sendSuccess(res, populatedLabourRate, 'Labour record created successfully', 201)
  } catch (error) {
    next(error)
  }
}

/**
 * Update labour rate
 */
export const updateLabourRate = async (req, res, next) => {
  try {
    const { labourExpense, bags } = req.body
    const { id } = req.params

    // Check if labour rate exists
    const labourRate = await LabourRate.findById(id)
    if (!labourRate) {
      throw new NotFoundError('Labour record')
    }

    // If labour expense is being changed, validate it and update rate
    let rate = labourRate.rate
    if (labourExpense && labourExpense !== labourRate.labourExpense.toString()) {
      const labourExpenseDoc = await LabourExpense.findById(labourExpense)
      if (!labourExpenseDoc) {
        throw new NotFoundError('Labour expense')
      }
      if (!labourExpenseDoc.isActive) {
        throw new BadRequestError('This labour expense is not active')
      }
      rate = labourExpenseDoc.rate
    }

    // Update labour rate
    const updatedLabourRate = await LabourRate.findByIdAndUpdate(
      id,
      {
        labourExpense: labourExpense || labourRate.labourExpense,
        bags: bags !== undefined ? bags : labourRate.bags,
        rate,
      },
      { new: true, runValidators: true }
    )
      .populate('labourExpense', 'name rate')
      .populate('createdBy', 'name email')

    sendSuccess(res, updatedLabourRate, 'Labour record updated successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Delete/Deactivate labour rate (soft delete)
 */
export const deleteLabourRate = async (req, res, next) => {
  try {
    const { id } = req.params

    const labourRate = await LabourRate.findById(id)
    if (!labourRate) {
      throw new NotFoundError('Labour record')
    }

    // Soft delete by setting isActive to false
    await LabourRate.findByIdAndUpdate(id, { isActive: false })

    sendSuccess(res, null, 'Labour record deleted successfully')
  } catch (error) {
    next(error)
  }
}

