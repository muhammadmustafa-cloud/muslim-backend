import mongoose from 'mongoose';
import { ENTRY_TYPES } from '../utils/constants.js';

const cashEntrySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Entry name is required'],
    trim: true,
    maxlength: [200, 'Name cannot be more than 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  // For credit entries - which account receives the money
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account'
  },
  // For debit entries - category of expense
  category: {
    type: String,
    enum: ['mazdoor', 'electricity', 'rent', 'transport', 'raw_material', 'maintenance', 'other', 'customer_payment', 'supplier_payment'],
    trim: true
  },
  // Reference to mazdoor if entry is related to mazdoor
  mazdoor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mazdoor'
  },
  // Reference to customer if entry is related to customer
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  // Reference to supplier if entry is related to supplier
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  // Payment method
  paymentMethod: {
    type: String,
    enum: ['cash', 'cheque', 'bank_transfer', 'online'],
    default: 'cash'
  },
  // Supporting document/image
  image: {
    type: String,
    trim: true
  },
  // Entry type for audit trail
  entryType: {
    type: String,
    enum: Object.values(ENTRY_TYPES),
    required: true
  },
  // Link to payment if this entry creates a payment record
  paymentReference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  // Link to expense if this entry creates an expense record
  expenseReference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const dailyCashMemoSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, 'Date is required'],
      unique: true,
      index: true
    },
    // Credit entries (Cash In)
    creditEntries: {
      type: [cashEntrySchema],
      default: []
    },
    // Previous balance for credit section
    previousBalance: {
      type: Number,
      default: 0,
      min: [0, 'Previous balance cannot be negative']
    },
    // Debit entries (Cash Out)
    debitEntries: {
      type: [cashEntrySchema],
      default: []
    },
    // Calculated closing balance
    closingBalance: {
      type: Number,
      default: 0
    },
    // Status of the cash memo
    status: {
      type: String,
      enum: ['draft', 'posted', 'closed'],
      default: 'draft'
    },
    // Total cash in hand at start of day
    openingBalance: {
      type: Number,
      default: 0,
      min: [0, 'Opening balance cannot be negative']
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot be more than 1000 characters']
    },
    // Audit trail fields
    postedAt: {
      type: Date
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
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

// Virtual for total credit
dailyCashMemoSchema.virtual('totalCredit').get(function() {
  const entriesTotal = this.creditEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
  return this.openingBalance + entriesTotal;
});

// Virtual for total debit
dailyCashMemoSchema.virtual('totalDebit').get(function() {
  return this.debitEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
});

// Calculate closing balance before saving
dailyCashMemoSchema.pre('save', function(next) {
  const totalCredit = this.totalCredit;
  const totalDebit = this.totalDebit;
  this.closingBalance = totalCredit - totalDebit;
  
  // Set posted timestamp when status changes to posted
  if (this.isModified('status') && this.status === 'posted' && !this.postedAt) {
    this.postedAt = new Date();
  }
  
  next();
});

// Indexes
dailyCashMemoSchema.index({ date: -1 });
dailyCashMemoSchema.index({ createdAt: -1 });
dailyCashMemoSchema.index({ createdBy: 1 });

export default mongoose.model('DailyCashMemo', dailyCashMemoSchema);

