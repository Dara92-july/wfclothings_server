const slugify = require('slugify');

// Generate unique order number: WF-YYYYMMDD-XXXX
const generateOrderNumber = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `WF-${dateStr}-${random}`;
};

// Generate unique slug
const generateSlug = (name) => {
  return `${slugify(name, { lower: true, strict: true })}-${Date.now()}`;
};

// Calculate pricing
const calculatePricing = (items) => {
  let subtotal = 0;

  const itemDetails = items.map(item => {
    const itemSubtotal = item.price * item.quantity;
    subtotal += itemSubtotal;

    return {
      ...item,
      itemSubtotal,
      discount: 0,
      finalItemPrice: itemSubtotal
    };
  });

  const deliveryFee = subtotal > 500000 ? 0 : 2500;
  const total = subtotal + deliveryFee;

  return {
    items: itemDetails,
    subtotal,
    discount: 0,
    deliveryFee,
    total
  };
};

// Pagination helper
const getPagination = (page = 1, limit = 10) => {
  const skip = (Number(page) - 1) * Number(limit);
  return { skip, limit: Number(limit) };
};

// Filter builder for products
const buildProductFilter = (query) => {
  const filter = { isActive: true };

  if (query.category) {
    filter.category = query.category;
  }

  if (query.minPrice || query.maxPrice) {
    filter.price = {};
    if (query.minPrice) filter.price.$gte = Number(query.minPrice);
    if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
  }

  if (query.search) {
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { description: { $regex: escaped, $options: 'i' } },
      { tags: { $in: [new RegExp(escaped, 'i')] } }
    ];
  }

  if (query.inStock === 'true') {
    filter.stockQuantity = { $gt: 0 };
  }

  if (query.featured === 'true') {
    filter.featured = true;
  }

  return filter;
};

module.exports = {
  generateOrderNumber,
  generateSlug,
  calculatePricing,
  getPagination,
  buildProductFilter
};
