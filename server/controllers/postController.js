const Post = require('../models/Post');
const ErrorResponse = require('../utils/errorResponse');

// Create a new post
exports.createPost = async (req, res, next) => {
  try {
    const { text, mediaUrl, mediaType } = req.body;

    if (!text && !mediaUrl) {
      return next(new ErrorResponse('Post must include text or media', 400));
    }

    const post = await Post.create({
      user: req.user._id,
      text: text?.trim(),
      mediaUrl: mediaUrl || '',
      mediaType: mediaType || ''
    });

    const populated = await post.populate('user', 'firstName lastName photo role');

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

// Get current user's posts
exports.getMyPosts = async (req, res, next) => {
  try {
    const posts = await Post.find({ user: req.user._id })
      .sort({ createdAt: -1 });
    res.json({ success: true, count: posts.length, data: posts });
  } catch (err) {
    next(err);
  }
};

// Get posts by user id
exports.getUserPosts = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const posts = await Post.find({ user: userId })
      .sort({ createdAt: -1 });
    res.json({ success: true, count: posts.length, data: posts });
  } catch (err) {
    next(err);
  }
};

// Get feed (optional simple)
exports.getFeed = async (req, res, next) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, count: posts.length, data: posts });
  } catch (err) {
    next(err);
  }
};

// Delete post (owner only)
exports.deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return next(new ErrorResponse('Post not found', 404));
    if (String(post.user) !== String(req.user._id)) {
      return next(new ErrorResponse('Not authorized to delete this post', 403));
    }
    await post.deleteOne();
    res.json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};
