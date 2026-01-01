import mongoose from 'mongoose';
import { EXPENSE_CATEGORIES } from '../utils/constants.js';

const expenseSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: Object.values(EXPENSE_CATEGORIES),
      required: [true, 'Expense category is required']
    },
    subCategory: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [500, 'Description cannot be more than 500 characters']
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative']
    },
    date: {
      type: Date,
      required: true,
      default: Date.now
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank', 'cheque', 'online'],
      default: 'cash'
    },
    // Reference for mazdoor expenses
    mazdoor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mazdoor'
    },
    // Reference for supplier expenses (like raw material purchase)
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier'
    },
    // Bill/Receipt number
    billNumber: {
      type: String,
      trim: true
    },
    // Attachments
    attachments: [{
      type: String,
      trim: true
    }],
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot be more than 1000 characters']
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
expenseSchema.index({ category: 1 });
expenseSchema.index({ date: -1 });
expenseSchema.index({ mazdoor: 1 });
expenseSchema.index({ supplier: 1 });
expenseSchema.index({ createdBy: 1 });
expenseSchema.index({ createdAt: -1 });

export default mongoose.model('Expense', expenseSchema);

