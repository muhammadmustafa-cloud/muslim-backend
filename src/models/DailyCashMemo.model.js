import mongoose from 'mongoose';

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
  image: {
    type: String,
    trim: true
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

// Virtual for total credit
dailyCashMemoSchema.virtual('totalCredit').get(function() {
  const entriesTotal = this.creditEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
  return this.previousBalance + entriesTotal;
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
  next();
});

// Indexes
dailyCashMemoSchema.index({ date: -1 });
dailyCashMemoSchema.index({ createdAt: -1 });
dailyCashMemoSchema.index({ createdBy: 1 });

export default mongoose.model('DailyCashMemo', dailyCashMemoSchema);

