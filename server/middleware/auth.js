const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');

// Protect routes
exports.protect = async (req, res, next) => {
  // Skip authentication for unread-counts route as it doesn't require auth for demo purposes
  if (req.path.includes('/unread-counts')) {
    console.log('🔓 Skipping authentication for unread-counts route');
    return next();
  }

  let token;

  // Get token from header or cookie
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    // Set token from cookie
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    // Check if this is a mock token for testing
    if (token === 'mock-jwt-token-for-testing') {
      console.log('Using mock token for testing');
      req.user = {
        id: '507f1f77bcf86cd799439011',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        role: 'user'
      };
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if MongoDB is connected before querying User model
    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️ MongoDB not connected, cannot verify user for protected route');
      return next(new ErrorResponse('Database not available', 503));
    }

    req.user = await User.findById(decoded.id);
    next();
  } catch (err) {
    console.error('Authentication error:', err.message);
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role ${req.user.role} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};
