import mongoose from 'mongoose';

const labourExpenseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [100, 'Name cannot be more than 100 characters'],
      unique: true
    },
    rate: {
      type: Number,
      required: [true, 'Please provide a rate'],
      min: [0, 'Rate must be a positive number']
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Index for faster queries
labourExpenseSchema.index({ name: 1 });
labourExpenseSchema.index({ isActive: 1 });

const LabourExpense = mongoose.model('LabourExpense', labourExpenseSchema);

export default LabourExpense;
