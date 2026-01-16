import mongoose from 'mongoose';
import { TRANSACTION_TYPES, PAYMENT_STATUS } from '../utils/constants.js';

const transactionItemSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [0, 'Quantity cannot be negative']
  },
  rate: {
    type: Number,
    required: true,
    min: [0, 'Rate cannot be negative']
  },
  total: {
    type: Number,
    required: true,
    min: [0, 'Total cannot be negative']
  }
}, { _id: false });

const transactionSchema = new mongoose.Schema(
  {
    transactionNumber: {
      type: String,
      unique: true,
      // Do not mark as required; it is generated automatically before validation
      trim: true,
      uppercase: true
    },
    type: {
      type: String,
      enum: Object.values(TRANSACTION_TYPES),
      required: [true, 'Transaction type is required']
    },
    // Reference to customer or supplier
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer'
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier'
    },
    // Transaction items (for purchase/sale)
    items: [transactionItemSchema],
    // Financial details
    subtotal: {
      type: Number,
      default: 0,
      min: [0, 'Subtotal cannot be negative']
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative']
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, 'Tax cannot be negative']
    },
    total: {
      type: Number,
      required: true,
      min: [0, 'Total cannot be negative']
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, 'Paid amount cannot be negative']
    },
    remainingAmount: {
      type: Number,
      default: 0,
      min: [0, 'Remaining amount cannot be negative']
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank', 'cheque', 'online'],
      default: 'cash'
    },
    // Date fields
    date: {
      type: Date,
      required: true,
      default: Date.now
    },
    dueDate: {
      type: Date
    },
    // Additional info
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot be more than 1000 characters']
    },
    attachments: [{
      type: String,
      trim: true
    }],
    // Status
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
transactionSchema.index({ transactionNumber: 1 });
transactionSchema.index({ type: 1, date: -1 });
transactionSchema.index({ customer: 1 });
transactionSchema.index({ supplier: 1 });
transactionSchema.index({ date: -1 });
transactionSchema.index({ paymentStatus: 1 });
transactionSchema.index({ createdBy: 1 });
transactionSchema.index({ createdAt: -1 });

// Auto-generate transaction number before validation so "required" checks don't fail
transactionSchema.pre('validate', function (next) {
  if (!this.transactionNumber) {
    const prefix = (this.type || '').substring(0, 2).toUpperCase();
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.transactionNumber = `${prefix}${timestamp}${random}`;
  }

  // Calculate remaining amount and set payment status prior to validation/save
  this.remainingAmount = Math.max(0, (this.total || 0) - (this.paidAmount || 0));

  if (this.remainingAmount === 0) {
    this.paymentStatus = PAYMENT_STATUS.PAID;
  } else if ((this.paidAmount || 0) > 0) {
    this.paymentStatus = PAYMENT_STATUS.PARTIAL;
  } else {
    this.paymentStatus = PAYMENT_STATUS.PENDING;
  }

  next();
});

export default mongoose.model('Transaction', transactionSchema);

