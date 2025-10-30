const express = require('express');
const {
  register,
  login,
  getMe,
  logout,
  updateProfile,
  changePassword
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.use(protect);
router.get('/me', getMe);
router.put('/profile', updateProfile);
router.put('/password', changePassword);
router.get('/logout', logout);


module.exports = router;
