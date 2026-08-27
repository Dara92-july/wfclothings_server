const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');
const { reviewValidator } = require('../middleware/validate');

router.post('/', protect, reviewValidator, reviewController.createReview);
router.get('/product/:productId', reviewController.getProductReviews);

module.exports = router;
