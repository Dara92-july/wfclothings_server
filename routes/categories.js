const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');

router.get('/', categoryController.getCategories);
router.get('/:slug', categoryController.getCategory);
router.post('/', protect, adminOnly, categoryController.createCategory);
router.put('/:id', protect, adminOnly, categoryController.updateCategory);
router.delete('/:id', protect, adminOnly, categoryController.deleteCategory);

module.exports = router;
