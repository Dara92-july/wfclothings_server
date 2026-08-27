const multer = require('multer');
const path = require('path');
const ApiError = require('../utils/ApiError');

// Memory storage for Cloudinary upload
const memoryStorage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Only image files (JPEG, PNG, WEBP, GIF) are allowed'), false);
  }
};

const upload = multer({
  storage: memoryStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 5 // Max 5 files per upload
  }
});

const uploadProductImages = upload.array('images', 5);
const uploadAvatar = upload.single('avatar');
const uploadReviewImages = upload.array('images', 3);

module.exports = {
  uploadProductImages,
  uploadAvatar,
  uploadReviewImages
};
