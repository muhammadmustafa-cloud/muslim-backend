import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      maxlength: [200, 'Name cannot be more than 200 characters']
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      maxlength: [500, 'Address cannot be more than 500 characters']
    },
    phone: {
      type: String,
      trim: true,
      default: undefined,
      validate: {
        validator: function(v) {
          // Only validate if phone is provided and not empty
          return !v || /^[0-9]{10,15}$/.test(v);
        },
        message: 'Please provide a valid phone number'
      }
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

// Indexes
customerSchema.index({ name: 1 });
customerSchema.index({ phone: 1 });
customerSchema.index({ isActive: 1 });
customerSchema.index({ createdAt: -1 });

export default mongoose.model('Customer', customerSchema);

