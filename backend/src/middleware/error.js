exports.notFound = (req, _res, next) => {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
};

exports.errorHandler = (err, _req, res, _next) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Server error';

  // PostgreSQL error codes
  if (err.code === '23505') {
    status = 409;
    message = String(err.constraint || '').includes('email')
      ? 'An account with this email already exists'
      : 'This item already exists';
  } else if (err.code === '23514' || err.code === '22001') {
    status = 400;
    message = 'Invalid or too-long value provided';
  }

  if (err.name === 'MulterError') {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 5 MB)' : 'Invalid file upload';
  }

  if (status === 500) console.error(err);
  res.status(status).json({
    success: false,
    message: status === 500 && process.env.NODE_ENV === 'production' ? 'Server error' : message,
  });
};
