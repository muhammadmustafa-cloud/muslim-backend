import mongoose from 'mongoose';

const labourRateSchema = new mongoose.Schema(
  {
    labourExpense: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LabourExpense',
      required: [true, 'Please select a labour expense']
    },
    bags: {
      type: Number,
      required: [true, 'Please provide number of bags'],
      min: [0, 'Bags cannot be negative']
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
    },
    // Add name field to handle old index, but make it optional and not unique
    name: {
      type: String,
      required: false,
      unique: false,
      sparse: true // Only enforce uniqueness on non-null values
    }
  },
  {
    timestamps: true
  }
);

// Index for faster queries
labourRateSchema.index({ labourExpense: 1 });
labourRateSchema.index({ isActive: 1 });

const LabourRate = mongoose.model('LabourRate', labourRateSchema);

export default LabourRate;
