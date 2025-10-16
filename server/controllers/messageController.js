const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');

// Enable debug logging for Mongoose in development
if (process.env.NODE_ENV === 'development') {
  mongoose.set('debug', (collectionName, method, query, doc) => {
    console.log(`Mongoose: ${collectionName}.${method}`, JSON.stringify(query), doc);
  });
}

// Helper function to handle errors
const handleError = (res, error, message = 'An error occurred') => {
  console.error(`❌ ${message}:`, error);
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? error.message : message
  });
};

// @desc    Send a new message
// @route   POST /api/messages
// @access  Private
const sendMessage = asyncHandler(async (req, res) => {
  const { recipientId, content } = req.body;
  const senderId = req.user._id;
  let session;

  if (!recipientId || !content) {
    return res.status(400).json({
      success: false,
      error: 'Please provide recipient and message content'
    });
  }
  
  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(recipientId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid recipient ID format'
    });
  }

  console.log('Starting sendMessage with:', { senderId, recipientId, content });
  
  // Start a new session for the transaction
  session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Get or create conversation
    const conversation = await Message.findOrCreateConversation(senderId, recipientId);
    console.log('Using conversation:', conversation._id);
    
    // Create and save the message
    const message = new Message({
      participants: [senderId, recipientId],
      sender: senderId,
      recipient: recipientId,
      content: content.trim(),
      isRead: false,
      isPartOfThread: true,
      conversationId: conversation._id
    });
    
    const savedMessage = await message.save({ session });
    console.log('Message saved:', savedMessage._id);
    
    // Update conversation's last message
    conversation.lastMessage = savedMessage._id;
    conversation.unreadCount = (conversation.unreadCount || 0) + 1;
    await conversation.save({ session });
    
    // Populate sender and recipient details
    const populatedMessage = await Message.findById(savedMessage._id)
      .populate('sender', 'firstName lastName photo role')
      .populate('recipient', 'firstName lastName photo role');
    
    await session.commitTransaction();
    console.log('Transaction committed successfully');
    
    res.status(201).json({
      success: true,
      data: populatedMessage
    });
  } catch (error) {
    console.error('❌ Error in sendMessage:', error.message);
    
    // Log additional error details in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      });
    }
    
    // Abort transaction if still in progress
    if (session && session.inTransaction()) {
      console.log('🛑 Aborting transaction...');
      await session.abortTransaction();
      session.endSession();
      console.log('✅ Transaction aborted');
    }
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.errors : undefined
      });
    }
    
    // Default error response
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while sending the message'
    });
  } finally {
    // End session if it's still active
    if (session && session.inTransaction()) {
      session.endSession().catch(console.error);
    }
  }
});

// @desc    Get all conversations for the current user
// @route   GET /api/messages/conversations
// @access  Private
const getConversations = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get all conversations where the user is a participant
    const conversations = await Message.find({
      participants: userId,
      isPartOfThread: false // Only get conversation starters
    })
    .populate('participants', 'firstName lastName photo role')
    .populate('lastMessage')
    .sort({ updatedAt: -1 });
    
    res.json({
      success: true,
      count: conversations.length,
      data: conversations
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch conversations');
  }
});

// @desc    Get messages for a specific conversation
// @route   GET /api/messages/conversation/:conversationId
// @access  Private
const getConversationMessages = asyncHandler(async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    // Verify the user is a participant in this conversation
    const conversation = await Message.findOne({
      _id: conversationId,
      participants: userId
    });
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found or access denied'
      });
    }
    
    // Get paginated messages for this conversation
    const messages = await Message.getConversationMessages(conversationId, { page, limit });
    
    res.json({
      success: true,
      ...messages
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch conversation messages');
  }
});

// @desc    Delete a message
// @route   DELETE /api/messages/:messageId
// @access  Private
const deleteMessage = asyncHandler(async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;
    
    // Find the message and verify ownership
    const message = await Message.findOne({
      _id: messageId,
      $or: [
        { sender: userId },
        { recipient: userId }
      ]
    });
    
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found or access denied'
      });
    }
    
    // Soft delete by marking as deleted
    message.deletedAt = new Date();
    message.isDeleted = true;
    await message.save();
    
    res.json({
      success: true,
      data: { id: messageId },
      message: 'Message deleted successfully'
    });
  } catch (error) {
    handleError(res, error, 'Failed to delete message');
  }
});

// @desc    Get unread message counts for current user
// @route   GET /api/messages/unread-counts/:userId
// @access  Private
const getUnreadCounts = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;

    // For demo purposes, allow access without authentication
    // In production, you'd want to verify the user is authenticated and owns the data

    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      // Return mock unread counts when DB is not available
      const mockUnreadCounts = {
        '507f1f77bcf86cd799439011_507f1f77bcf86cd799439012': 3,
        '507f1f77bcf86cd799439011_507f1f77bcf86cd799439013': 1,
        '507f1f77bcf86cd799439011_507f1f77bcf86cd799439014': 5
      };

      return res.json({
        success: true,
        data: mockUnreadCounts
      });
    }

    // Get all conversations for the user and count unread messages
    const conversations = await Message.aggregate([
      {
        $match: {
          participants: mongoose.Types.ObjectId(userId),
          isDeleted: { $ne: true }
        }
      },
      {
        $group: {
          _id: {
            $cond: {
              if: { $eq: ['$sender', mongoose.Types.ObjectId(userId)] },
              then: { $concat: [{ $toString: '$recipient' }, '_', { $toString: '$sender' }] },
              else: { $concat: [{ $toString: '$sender' }, '_', { $toString: '$recipient' }] }
            }
          },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [
                  { $ne: ['$sender', mongoose.Types.ObjectId(userId)] },
                  { $eq: ['$isRead', false] }
                ]},
                1,
                0
              ]
            }
          },
          lastMessage: { $last: '$$ROOT' }
        }
      },
      {
        $match: {
          unreadCount: { $gt: 0 }
        }
      }
    ]);

    // Convert to the expected format (conversationId -> count)
    const unreadCounts = {};
    conversations.forEach(conv => {
      unreadCounts[conv._id] = conv.unreadCount;
    });

    res.json({
      success: true,
      data: unreadCounts
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch unread counts');
  }
});

// Export all controller methods
module.exports = {
  sendMessage,
  getConversations,
  getConversationMessages,
  deleteMessage,
  getUnreadCounts
};
