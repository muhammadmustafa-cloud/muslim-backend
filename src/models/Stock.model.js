import mongoose from 'mongoose';
import { INVENTORY_OPERATIONS } from '../utils/constants.js';

const stockSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: [true, 'Item is required']
    },
    operation: {
      type: String,
      enum: Object.values(INVENTORY_OPERATIONS),
      required: [true, 'Operation type is required']
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative']
    },
    previousStock: {
      type: Number,
      required: true,
      default: 0
    },
    newStock: {
      type: Number,
      required: true,
      default: 0
    },
    rate: {
      type: Number,
      min: [0, 'Rate cannot be negative'],
      default: 0
    },
    totalAmount: {
      type: Number,
      min: [0, 'Total amount cannot be negative'],
      default: 0
    },
    // Reference to supplier or customer
    reference: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'referenceType'
    },
    referenceType: {
      type: String,
      enum: ['Supplier', 'Customer', 'Transaction', null],
      default: null
    },
    // For adjustments and transfers
    reason: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot be more than 500 characters']
    },
    date: {
      type: Date,
      required: true,
      default: Date.now
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
stockSchema.index({ item: 1, date: -1 });
stockSchema.index({ operation: 1 });
stockSchema.index({ date: -1 });
stockSchema.index({ reference: 1, referenceType: 1 });
stockSchema.index({ createdBy: 1 });

export default mongoose.model('Stock', stockSchema);

