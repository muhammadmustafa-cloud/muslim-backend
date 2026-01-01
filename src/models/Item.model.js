import mongoose from 'mongoose';
import { ITEM_TYPES, UNITS } from '../utils/constants.js';

const itemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      maxlength: [200, 'Name cannot be more than 200 characters']
    },
    code: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
      sparse: true
    },
    type: {
      type: String,
      enum: Object.values(ITEM_TYPES),
      required: [true, 'Item type is required']
    },
    category: {
      type: String,
      trim: true
    },
    unit: {
      type: String,
      enum: Object.values(UNITS),
      required: [true, 'Unit of measurement is required'],
      default: UNITS.KILOGRAM
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot be more than 500 characters']
    },
    // For finished products - conversion from raw material
    conversionRate: {
      type: Number,
      min: [0, 'Conversion rate cannot be negative'],
      default: 1
    },
    rawMaterial: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item'
    },
    // Pricing
    purchasePrice: {
      type: Number,
      min: [0, 'Purchase price cannot be negative'],
      default: 0
    },
    sellingPrice: {
      type: Number,
      min: [0, 'Selling price cannot be negative'],
      default: 0
    },
    // Stock tracking
    currentStock: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot be negative']
    },
    minStockLevel: {
      type: Number,
      default: 0,
      min: [0, 'Minimum stock level cannot be negative']
    },
    maxStockLevel: {
      type: Number,
      default: 0,
      min: [0, 'Maximum stock level cannot be negative']
    },
    reorderPoint: {
      type: Number,
      default: 0,
      min: [0, 'Reorder point cannot be negative']
    },
    // Status
    isActive: {
      type: Boolean,
      default: true
    },
    // Metadata
    tags: [{
      type: String,
      trim: true
    }],
    image: {
      type: String,
      trim: true
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
itemSchema.index({ name: 1 });
itemSchema.index({ code: 1 });
itemSchema.index({ type: 1 });
itemSchema.index({ category: 1 });
itemSchema.index({ isActive: 1 });
itemSchema.index({ currentStock: 1 });
itemSchema.index({ createdAt: -1 });

// Virtual to check if stock is low
itemSchema.virtual('isLowStock').get(function () {
  return this.minStockLevel > 0 && this.currentStock <= this.minStockLevel;
});

// Auto-generate code if not provided
itemSchema.pre('save', async function (next) {
  if (!this.code && this.name) {
    // Generate code from name (first 3 letters + timestamp)
    const prefix = this.name.substring(0, 3).toUpperCase().replace(/\s/g, '');
    const timestamp = Date.now().toString().slice(-6);
    this.code = `${prefix}${timestamp}`;
  }
  next();
});

export default mongoose.model('Item', itemSchema);

