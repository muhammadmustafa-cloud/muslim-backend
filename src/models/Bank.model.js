import mongoose from 'mongoose';

const bankSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Bank name is required'],
      trim: true,
      maxlength: [200, 'Bank name cannot be more than 200 characters']
    },
    accountNumber: {
      type: String,
      required: [true, 'Bank account number is required'],
      trim: true,
      maxlength: [50, 'Account number cannot be more than 50 characters']
    },
    branch: {
      type: String,
      required: [true, 'Branch is required'],
      trim: true,
      maxlength: [200, 'Branch cannot be more than 200 characters']
    },
    accountTitle: {
      type: String,
      trim: true,
      maxlength: [200, 'Account title cannot be more than 200 characters']
    },
    iban: {
      type: String,
      trim: true,
      maxlength: [34, 'IBAN cannot be more than 34 characters']
    },
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

bankSchema.index({ name: 1 });
bankSchema.index({ accountNumber: 1 });
bankSchema.index({ isActive: 1 });
bankSchema.index({ createdAt: -1 });

export default mongoose.model('Bank', bankSchema);
