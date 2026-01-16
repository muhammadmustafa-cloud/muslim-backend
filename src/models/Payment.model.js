import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    voucherNumber: {
      type: String,
      // Not required: it is auto-generated before validation
      trim: true,
      uppercase: true
    },
    type: {
      type: String,
      enum: ['payment', 'receipt'],
      required: [true, 'Payment type is required']
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now
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
      min: [0.01, 'Amount must be greater than 0']
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'cheque', 'bank_transfer', 'online'],
      default: 'cash',
      required: true
    },
    chequeNumber: {
      type: String,
      trim: true
    },
    // For payments - account money is deducted from
    fromAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: function() {
        return this.type === 'payment';
      }
    },
    // For receipts - account money is added to
    toAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: function() {
        return this.type === 'receipt';
      }
    },
    // Who payment is made to (for payments)
    paidTo: {
      type: String,
      trim: true
    },
    // Reference to mazdoor if payment is for mazdoor
    mazdoor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mazdoor'
    },
    // Reference to customer if receipt is from customer
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer'
    },
    // Reference to supplier if payment is to supplier
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier'
    },
    // Category for payments
    category: {
      type: String,
      enum: ['mazdoor', 'electricity', 'rent', 'transport', 'raw_material', 'maintenance', 'other', 'customer_payment', 'supplier_payment'],
      trim: true
    },
    // Who receipt is received from (for receipts)
    receivedFrom: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['draft', 'posted', 'cancelled'],
      default: 'posted'
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

// Indexes
paymentSchema.index({ voucherNumber: 1 });
paymentSchema.index({ type: 1 });
paymentSchema.index({ date: -1 });
paymentSchema.index({ fromAccount: 1 });
paymentSchema.index({ toAccount: 1 });
paymentSchema.index({ mazdoor: 1 });
paymentSchema.index({ customer: 1 });
paymentSchema.index({ supplier: 1 });
paymentSchema.index({ category: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdBy: 1 });
paymentSchema.index({ createdAt: -1 });

// Generate voucher number before validation so required checks don't fail
paymentSchema.pre('validate', async function(next) {
  if (!this.voucherNumber && this.isNew) {
    try {
      const Payment = mongoose.model('Payment');
      const count = await Payment.countDocuments({ type: this.type });
      const prefix = this.type === 'payment' ? 'PAY' : 'REC';
      this.voucherNumber = `${prefix}-${String(count + 1).padStart(6, '0')}`;
    } catch (error) {
      // Fallback if model not available
      const prefix = this.type === 'payment' ? 'PAY' : 'REC';
      this.voucherNumber = `${prefix}-${Date.now().toString().slice(-6)}`;
    }
  }
  next();
});

// Post-save middleware to update account balance
paymentSchema.post('save', async function() {
  try {
    const Account = mongoose.model('Account');
    
    if (this.type === 'payment' && this.fromAccount && this.status === 'posted') {
      // Deduct from account
      await Account.findByIdAndUpdate(
        this.fromAccount,
        { $inc: { currentBalance: -this.amount } }
      );
    } else if (this.type === 'receipt' && this.toAccount && this.status === 'posted') {
      // Add to account
      await Account.findByIdAndUpdate(
        this.toAccount,
        { $inc: { currentBalance: this.amount } }
      );
    }
  } catch (error) {
    console.error('Error updating account balance:', error);
  }
});

// Post-remove middleware to reverse account balance
paymentSchema.post('findOneAndDelete', async function(doc) {
  if (!doc) return;
  
  try {
    const Account = mongoose.model('Account');
    
    if (doc.type === 'payment' && doc.fromAccount && doc.status === 'posted') {
      // Reverse deduction
      await Account.findByIdAndUpdate(
        doc.fromAccount,
        { $inc: { currentBalance: doc.amount } }
      );
    } else if (doc.type === 'receipt' && doc.toAccount && doc.status === 'posted') {
      // Reverse addition
      await Account.findByIdAndUpdate(
        doc.toAccount,
        { $inc: { currentBalance: -doc.amount } }
      );
    }
  } catch (error) {
    console.error('Error reversing account balance:', error);
  }
});

export default mongoose.model('Payment', paymentSchema);

