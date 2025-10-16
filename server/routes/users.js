const express = require('express');
const router = express.Router();
// const { protect } = require('../middleware/auth'); // Temporarily disabled for debugging
const { getUsers, searchUsers, getUserById } = require('../controllers/userController');

// Public route - Get all users (for messaging interface)
// router.use(protect); // Temporarily disabled for debugging

// Get all users (except current user)
router.get('/', getUsers);

// Search users by name or role
router.get('/search', searchUsers);

// Get single user by id
router.get('/:userId', getUserById);

module.exports = router;
