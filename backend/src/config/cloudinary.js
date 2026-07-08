const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ─── Detect real vs placeholder credentials ───────────────────────────────────
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
const API_KEY    = process.env.CLOUDINARY_API_KEY    || '';
const API_SECRET = process.env.CLOUDINARY_API_SECRET || '';

const PLACEHOLDERS = ['your_cloud', 'your_key', 'your_secret', '', 'undefined', 'null'];

const isCloudinaryConfigured =
  !PLACEHOLDERS.includes(CLOUD_NAME) &&
  !PLACEHOLDERS.includes(API_KEY)    &&
  !PLACEHOLDERS.includes(API_SECRET);

// ─── Configure Cloudinary (only when real creds exist) ───────────────────────
if (isCloudinaryConfigured) {
  cloudinary.config({ cloud_name: CLOUD_NAME, api_key: API_KEY, api_secret: API_SECRET });
  console.log('☁️  Cloudinary configured — image uploads enabled.');
} else {
  console.warn('⚠️  Cloudinary credentials not set. Using local disk storage for uploads.');
}

// ─── Storage strategy ─────────────────────────────────────────────────────────
let storage;

if (isCloudinaryConfigured) {
  storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'ecommerce/products',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
    },
  });
} else {
  // Fallback: save to local uploads/ directory
  const uploadDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext  = path.extname(file.originalname).toLowerCase();
      const name = `product-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
      cb(null, name);
    },
  });
}

// ─── Multer instance ──────────────────────────────────────────────────────────
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

module.exports = { cloudinary, upload, isCloudinaryConfigured };
