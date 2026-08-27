const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect, optionalAuth } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');
const { productValidator } = require('../middleware/validate');

router.get('/', optionalAuth, productController.getProducts);
router.get('/featured', productController.getFeatured);
router.get('/search', productController.searchProducts);
router.get('/:id', productController.getProduct);
router.post('/', protect, adminOnly, productValidator, productController.createProduct);
router.put('/:id', protect, adminOnly, productController.updateProduct);
router.delete('/:id', protect, adminOnly, productController.deleteProduct);

module.exports = router;
