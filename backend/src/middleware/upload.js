const multer = require('multer');
const AppError = require('../utils/AppError');

const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png'];

exports.uploadDocument = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    ALLOWED.includes(file.mimetype)
      ? cb(null, true)
      : cb(new AppError('Only PDF, JPG or PNG files are allowed')),
}).single('document');
