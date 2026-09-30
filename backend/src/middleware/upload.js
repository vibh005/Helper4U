const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const AppError = require('../utils/AppError');

const UPLOAD_DIR = path.join(__dirname, '../../uploads/documents');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png' };

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,

  filename: (_req, file, cb) =>
    cb(null, crypto.randomBytes(16).toString('hex') + ALLOWED[file.mimetype]),
});

exports.UPLOAD_DIR = UPLOAD_DIR;
exports.uploadDocument = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    ALLOWED[file.mimetype]
      ? cb(null, true)
      : cb(new AppError('Only PDF, JPG or PNG files are allowed')),
}).single('document');
