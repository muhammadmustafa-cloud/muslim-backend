import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Account code is required'],
      trim: true,
      unique: true,
      uppercase: true
    },
    name: {
      type: String,
      required: [true, 'Account name is required'],
      trim: true,
      maxlength: [200, 'Account name cannot be more than 200 characters']
    },
    type: {
      type: String,
      enum: ['asset', 'liability', 'income', 'expense', 'equity'],
      required: [true, 'Account type is required']
    },
    isCashAccount: {
      type: Boolean,
      default: false
    },
    isBankAccount: {
      type: Boolean,
      default: false
    },
    bankDetails: {
      bankName: {
        type: String,
        trim: true
      },
      accountNumber: {
        type: String,
        trim: true
      },
      branch: {
        type: String,
        trim: true
      },
      ifscCode: {
        type: String,
        trim: true
      }
    },
    openingBalance: {
      type: Number,
      default: 0,
      min: [0, 'Opening balance cannot be negative']
    },
    currentBalance: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
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
accountSchema.index({ code: 1 });
accountSchema.index({ type: 1 });
accountSchema.index({ isCashAccount: 1 });
accountSchema.index({ isBankAccount: 1 });
accountSchema.index({ isActive: 1 });
accountSchema.index({ createdBy: 1 });
accountSchema.index({ createdAt: -1 });

// Pre-save middleware to set opening balance as current balance if not set
accountSchema.pre('save', function(next) {
  if (this.isNew && this.currentBalance === 0 && this.openingBalance !== 0) {
    this.currentBalance = this.openingBalance;
  }
  next();
});

export default mongoose.model('Account', accountSchema);

