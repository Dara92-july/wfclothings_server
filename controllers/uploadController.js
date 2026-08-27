const { cloudinary } = require('../config/cloudinary');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const uploadImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, 'No files uploaded');
  }

  const uploadPromises = req.files.map(file => {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'wayforward/products', resource_type: 'image' },
        (error, result) => {
          if (error) reject(error);
          else resolve({ url: result.secure_url, public_id: result.public_id });
        }
      );
      uploadStream.end(file.buffer);
    });
  });

  const images = await Promise.all(uploadPromises);

  res.json({ success: true, data: { images } });
});

const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No file uploaded');

  const result = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'wayforward/avatars', resource_type: 'image', transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }] },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(req.file.buffer);
  });

  res.json({ success: true, data: { url: result.secure_url } });
});

module.exports = { uploadImages, uploadAvatar };
