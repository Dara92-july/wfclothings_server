const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { 
  CLOUDINARY_CLOUD_NAME, 
  CLOUDINARY_API_KEY, 
  CLOUDINARY_API_SECRET 
} = require('./env');

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'wayforward/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }],
    public_id: (req, file) => `${Date.now()}-${file.originalname.split('.')[0]}`
  }
});

const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'wayforward/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
    public_id: (req, file) => `avatar-${Date.now()}`
  }
});

module.exports = { cloudinary, storage, avatarStorage };
