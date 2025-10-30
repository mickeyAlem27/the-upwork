const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getUsers, searchUsers, getUserById } = require('../controllers/userController');

// Get all users (except current user) - needs protection
router.get('/', protect, getUsers);

// Search users by name or role - needs protection
router.get('/search', protect, searchUsers);

// Get single user by id - needs protection
router.get('/:userId', protect, getUserById);

module.exports = router;
