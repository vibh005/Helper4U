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
    message = 'An account with this email already exists';
  } else if (err.code === '23514' || err.code === '22001') {
    status = 400;
    message = 'Invalid or too-long value provided';
  }

  if (status === 500) console.error(err);
  res.status(status).json({
    success: false,
    message: status === 500 && process.env.NODE_ENV === 'production' ? 'Server error' : message,
  });
};
