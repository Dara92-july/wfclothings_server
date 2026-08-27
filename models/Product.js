const mongoose = require('mongoose');
const slugify = require('slugify');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  discountPrice: {
    type: Number,
    min: [0, 'Discount price cannot be negative'],
    validate: {
      validator: function(val) {
        return val < this.price;
      },
      message: 'Discount price must be less than regular price'
    }
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Product category is required']
  },
  images: [{
    url: { type: String, required: true },
    public_id: { type: String }
  }],
  stockQuantity: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  reservedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  attributes: [{
    key: { type: String, required: true },
    values: [{ type: String, required: true }]
  }],
  ratings: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  totalSold: {
    type: Number,
    default: 0
  },
  lowStockThreshold: {
    type: Number,
    default: 5
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ featured: 1, isActive: 1 });
productSchema.index({ createdAt: -1 });

// Virtual for available stock
productSchema.virtual('availableStock').get(function() {
  return this.stockQuantity - this.reservedQuantity;
});

// Virtual for effective price (with discount)
productSchema.virtual('effectivePrice').get(function() {
  return this.discountPrice || this.price;
});

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (this.discountPrice && this.price > 0) {
    return Math.round(((this.price - this.discountPrice) / this.price) * 100);
  }
  return 0;
});

// Virtual for reviews (separate collection)
productSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'product',
  options: { sort: { createdAt: -1 } }
});

// Pre-save middleware to generate slug
productSchema.pre('save', function() {
  if (this.isModified('name')) {
    this.slug = `${slugify(this.name, { lower: true, strict: true })}-${Date.now()}`;
  }
});

// Method to check if stock is available
productSchema.methods.isInStock = function(quantity = 1) {
  return this.availableStock >= quantity;
};

// Method to reserve stock
productSchema.methods.reserveStock = async function(quantity) {
  if (!this.isInStock(quantity)) {
    throw new Error(`Insufficient stock. Available: ${this.availableStock}, Requested: ${quantity}`);
  }
  this.reservedQuantity += quantity;
  await this.save({ validateBeforeSave: false });
};

// Method to release reserved stock
productSchema.methods.releaseStock = async function(quantity) {
  this.reservedQuantity = Math.max(0, this.reservedQuantity - quantity);
  await this.save({ validateBeforeSave: false });
};

// Method to deduct stock (after successful payment)
productSchema.methods.deductStock = async function(quantity) {
  this.stockQuantity -= quantity;
  this.reservedQuantity = Math.max(0, this.reservedQuantity - quantity);
  this.totalSold += quantity;
await this.save({ validateBeforeSave: false });
};

  // Method to deduct stock (after successful payment)
  productSchema.methods.deductStock = async function(quantity) {
    this.stockQuantity -= quantity;
    this.reservedQuantity = Math.max(0, this.reservedQuantity - quantity);
    this.totalSold += quantity;
    await this.save({ validateBeforeSave: false });
  };

module.exports = mongoose.model('Product', productSchema);
