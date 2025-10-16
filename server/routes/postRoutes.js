const express = require('express');
const { protect } = require('../middleware/auth');
const {
  createPost,
  getMyPosts,
  getUserPosts,
  getFeed,
  deletePost
} = require('../controllers/postController');

const router = express.Router();

router.use(protect);

// Feed
router.get('/feed', getFeed);

// Current user's posts
router.get('/me', getMyPosts);

// Posts by user id
router.get('/user/:userId', getUserPosts);

// Create post
router.post('/', createPost);

// Delete post
router.delete('/:id', deletePost);

module.exports = router;
