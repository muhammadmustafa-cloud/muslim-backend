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
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^[0-9]{10,15}$/, 'Please provide a valid phone number']
    },
    alternatePhone: {
      type: String,
      trim: true
    },
    cnic: {
      type: String,
      trim: true,
      unique: true,
      sparse: true
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      zipCode: { type: String, trim: true },
      country: { type: String, trim: true, default: 'Pakistan' }
    },
    // Employment details
    hireDate: {
      type: Date,
      default: Date.now
    },
    salary: {
      type: Number,
      default: 0,
      min: [0, 'Salary cannot be negative']
    },
    salaryType: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'per_work'],
      default: 'daily'
    },
    // Current balance (advance payments, pending payments)
    currentBalance: {
      type: Number,
      default: 0
    },
    // Status
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
mazdoorSchema.index({ name: 1 });
mazdoorSchema.index({ phone: 1 });
mazdoorSchema.index({ cnic: 1 });
mazdoorSchema.index({ isActive: 1 });
mazdoorSchema.index({ createdAt: -1 });

// Virtual for full address
mazdoorSchema.virtual('fullAddress').get(function () {
  const addr = this.address;
  if (!addr) return '';
  const parts = [addr.street, addr.city, addr.state, addr.zipCode, addr.country].filter(Boolean);
  return parts.join(', ');
});

export default mongoose.model('Mazdoor', mazdoorSchema);

