const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');

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
    if (require('mongoose').connection.readyState !== 1) {
      console.log('MongoDB not connected, using mock authentication for testing');

      // Mock authentication for testing when DB is not available
      if (email === 'test@test.com' && password === 'password') {
        const mockUser = {
          id: '507f1f77bcf86cd799439011',
          firstName: 'Test',
          lastName: 'User',
          email: email,
          role: 'user'
        };

        // Create token
        const token = 'mock-jwt-token-for-testing';

        res.status(200).json({
          success: true,
          token,
          user: mockUser,
          message: 'Mock login successful (MongoDB not connected)'
        });
        return;
      } else {
        return next(new ErrorResponse('Invalid credentials', 401));
      }
    }

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    console.log('User found:', user ? 'Yes' : 'No');

    if (!user) {
      console.log('No user found with email:', email);
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check if password matches
    console.log('Checking password...');
    const isMatch = await user.matchPassword(password);
    console.log('Password match:', isMatch);

    if (!isMatch) {
      console.log('Password does not match');
      return next(new ErrorResponse('Invalid credentials', 401));
    }

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
      .status(200)
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
    console.error('Login error:', error);
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    // Check if MongoDB is connected
    if (require('mongoose').connection.readyState !== 1) {
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
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

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
