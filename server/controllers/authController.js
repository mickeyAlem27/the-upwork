const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const jwt = require('jsonwebtoken');

// Helper function to send token response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  // Set cookie options with default expiration of 30 days
  const cookieExpireDays = Number(process.env.JWT_COOKIE_EXPIRE) || 30; // Default to 30 days if not set
  const expires = new Date();
  expires.setDate(expires.getDate() + cookieExpireDays);
  
  const options = {
    expires: expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };
  
  // Remove password from output
  user.password = undefined;

  res.status(statusCode).cookie('token', token, options).json({
    success: true,
    token,
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      photo: user.photo,
      phone: user.phone,
      location: user.location,
      company: user.company,
      jobTitle: user.jobTitle,
      bio: user.bio,
      skills: user.skills
    }
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  const { firstName, lastName, email, password, role } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new ErrorResponse('User already exists with this email', 400));
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: role || 'user'
    });

    // Create token
    const token = user.getSignedJwtToken();

    // Set cookie options with default expiration of 30 days
    const cookieExpireDays = Number(process.env.JWT_COOKIE_EXPIRE) || 30; // Default to 30 days if not set
    const expires = new Date();
    expires.setDate(expires.getDate() + cookieExpireDays);
    
    const options = {
      expires: expires,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };
    
    console.log('Cookie options:', options);
    console.log('Cookie will expire on:', expires.toISOString());

    res
      .status(201)
      .cookie('token', token, options)
      .json({
        success: true,
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role
        }
      });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  console.log('Login attempt:', { email: req.body.email });

  const { email, password } = req.body;

  // Check if email and password are provided
  if (!email || !password) {
    console.log('Missing email or password');
    return next(new ErrorResponse('Please provide an email and password', 400));
  }

  try {
    // Check if MongoDB is connected
    const mongoose = require('mongoose');

    if (mongoose.connection.readyState === 1) {
      // MongoDB is connected - use database
      // Check for user
      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        return next(new ErrorResponse('Invalid credentials', 401));
      }

      // Check if password matches
      const isMatch = await user.matchPassword(password);

      if (!isMatch) {
        return next(new ErrorResponse('Invalid credentials', 401));
      }

      sendTokenResponse(user, 200, res);
    } else {
      // MongoDB not connected - allow demo login for testing
      console.log('🔐 Demo mode: Login (MongoDB not connected)');

      // Accept any email/password for demo purposes
      if (email && password && password.length >= 3) {
        // Create demo user object
        const demoUser = {
          _id: '507f1f77bcf86cd799439011',
          firstName: 'Demo',
          lastName: 'User',
          email: email,
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Create JWT token for demo user
        const token = jwt.sign(
          { id: demoUser._id, email: demoUser.email },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRE || '30d' }
        );

        res.status(200).json({
          success: true,
          token: token,
          user: demoUser,
          demo: true,
          message: 'Demo login successful (no database connection)'
        });
      } else {
        return next(new ErrorResponse('Please provide valid email and password (password must be at least 3 characters)', 400));
      }
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');

    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      console.log('MongoDB not connected, using mock user data for testing');

      // Return mock user data when DB is not available
      const mockUser = {
        _id: req.user.id || '507f1f77bcf86cd799439011',
        id: req.user.id || '507f1f77bcf86cd799439011',
        firstName: req.user.firstName || 'Test',
        lastName: req.user.lastName || 'User',
        email: req.user.email || 'test@test.com',
        role: req.user.role || 'user',
        photo: req.user.photo || null,
        phone: req.user.phone || '',
        location: req.user.location || '',
        company: req.user.company || '',
        jobTitle: req.user.jobTitle || '',
        bio: req.user.bio || '',
        skills: req.user.skills || []
      };

      res.status(200).json({
        success: true,
        data: mockUser
      });
      return;
    }

    const user = await User.findById(req.user.id).select('-password');
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');

    // Check if MongoDB is connected
    if (mongoose.connection.readyState === 1) {
      // MongoDB is connected - use database
      const fieldsToUpdate = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phone: req.body.phone,
        location: req.body.location,
        company: req.body.company,
        jobTitle: req.body.jobTitle,
        bio: req.body.bio,
        skills: req.body.skills,
        photo: req.body.photo
      };

      // Remove undefined fields
      Object.keys(fieldsToUpdate).forEach(key => {
        if (fieldsToUpdate[key] === undefined || fieldsToUpdate[key] === null || fieldsToUpdate[key] === '') {
          delete fieldsToUpdate[key];
        }
      });

      const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
        new: true,
        runValidators: true
      }).select('-password');

      res.status(200).json({
        success: true,
        data: user
      });
    } else {
      // MongoDB not connected - return demo response
      console.log('🔐 Demo mode: Profile update (MongoDB not connected)');

      // Return updated user data based on request
      const mockUpdatedUser = {
        _id: req.user.id,
        firstName: req.body.firstName || req.user.firstName,
        lastName: req.body.lastName || req.user.lastName,
        email: req.body.email || req.user.email,
        phone: req.body.phone || req.user.phone,
        location: req.body.location || req.user.location,
        company: req.body.company || req.user.company,
        jobTitle: req.body.jobTitle || req.user.jobTitle,
        bio: req.body.bio || req.user.bio,
        skills: req.body.skills || req.user.skills,
        photo: req.body.photo || req.user.photo,
        role: req.user.role || 'user',
        createdAt: req.user.createdAt || new Date(),
        updatedAt: new Date()
      };

      res.status(200).json({
        success: true,
        data: mockUpdatedUser,
        demo: true,
        message: 'Profile updated in demo mode (changes not persisted)'
      });
    }
  } catch (error) {
    console.error('Profile update error:', error);
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    const { currentPassword, newPassword } = req.body;

    // Check if MongoDB is connected
    if (mongoose.connection.readyState === 1) {
      // MongoDB is connected - use database
      // Get user with password
      const user = await User.findById(req.user.id).select('+password');

      // Check current password
      if (!(await user.matchPassword(currentPassword))) {
        return next(new ErrorResponse('Current password is incorrect', 400));
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Password updated successfully'
      });
    } else {
      // MongoDB not connected - return demo response
      console.log('🔐 Demo mode: Password change (MongoDB not connected)');

      // In demo mode, just pretend the password was changed
      res.status(200).json({
        success: true,
        message: 'Password changed successfully (demo mode)',
        demo: true
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   GET /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    // Clear the authentication cookie
    res.clearCookie('token');

    res.status(200).json({
      success: true,
      message: 'Successfully logged out'
    });
  } catch (error) {
    next(error);
  }
};
