const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');
const { uploadProductImages, uploadAvatar } = require('../middleware/upload');

router.post('/images', protect, adminOnly, uploadProductImages, uploadController.uploadImages);
router.post('/avatar', protect, uploadAvatar, uploadController.uploadAvatar);

module.exports = router;
