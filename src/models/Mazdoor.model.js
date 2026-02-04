import mongoose from 'mongoose';

const mazdoorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Mazdoor name is required'],
      trim: true,
      maxlength: [200, 'Name cannot be more than 200 characters']
    },
    phone: {
      type: String,
      trim: true
    },
    hireDate: {
      type: Date,
      required: [true, 'Hire date is required']
    },
    salary: {
      type: Number,
      required: [true, 'Salary is required'],
      min: [0, 'Salary cannot be negative']
    },
    salaryType: {
      type: String,
      required: [true, 'Salary type is required'],
      enum: ['daily', 'weekly', 'monthly', 'per_work']
    },
    currentBalance: {
      type: Number,
      default: 0
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

mazdoorSchema.index({ name: 1 });
mazdoorSchema.index({ phone: 1 });
mazdoorSchema.index({ isActive: 1 });
mazdoorSchema.index({ createdAt: -1 });

export default mongoose.model('Mazdoor', mazdoorSchema);
