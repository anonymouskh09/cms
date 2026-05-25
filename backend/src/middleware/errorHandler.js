function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.code === 'LIMIT_FILE_SIZE' ? 400
    : err.message?.includes('Invalid file type') ? 400
    : err.status || 500;
  res.status(status).json({
    success: false,
    message: err.code === 'LIMIT_FILE_SIZE' ? 'File exceeds size limit.' : (err.message || 'Internal server error'),
    errors: err.errors || undefined,
  });
}

module.exports = errorHandler;
