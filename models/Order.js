const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  size: { type: String },
  image: { type: String }
}, { _id: true });

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  guestInfo: {
    name: { type: String },
    email: { type: String },
    phone: { type: String }
  },
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  items: [orderItemSchema],
  deliveryAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, default: 'Nigeria' },
    zipCode: { type: String }
  },
  pricing: {
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    total: { type: Number, required: true }
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  statusHistory: [{
    status: { type: String },
    timestamp: { type: Date, default: Date.now },
    note: { type: String }
  }],
  payment: {
    method: { type: String, default: 'paystack' },
    reference: { type: String, unique: true, sparse: true },
    status: { type: String, enum: ['pending', 'success', 'failed', 'abandoned'], default: 'pending' },
    paidAt: { type: Date },
    verifiedAt: { type: Date }
  },
  tracking: {
    carrier: { type: String },
    trackingNumber: { type: String },
    url: { type: String }
  },
  notes: { type: String },
  isReviewed: { type: Boolean, default: false }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
orderSchema.index({ user: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

// Virtual for item count
orderSchema.virtual('itemCount').get(function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Method to update status with history
orderSchema.methods.updateStatus = async function(newStatus, note = '') {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    note
  });
  await this.save({ validateBeforeSave: false });
};

// Method to check if user can review
orderSchema.methods.canReview = function() {
  return this.status === 'delivered' && !this.isReviewed;
};

module.exports = mongoose.model('Order', orderSchema);
