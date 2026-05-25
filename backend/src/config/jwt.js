require('dotenv').config();

module.exports = {
  secret: process.env.JWT_SECRET || 'change-me-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '8h',
};
