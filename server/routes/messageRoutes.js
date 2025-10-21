const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// @desc    Get unread message counts for a user
// @route   GET /api/messages/unread-counts/:userId
router.get('/unread-counts/:userId', (req, res) => {
  console.log('✅ Unread counts route hit! userId:', req.params.userId);
  res.json({
    success: true,
    data: {
      '507f1f77bcf86cd799439011_507f1f77bcf86cd799439012': 2,
      '507f1f77bcf86cd799439011_507f1f77bcf86cd799439013': 1
    }
  });
});

// @desc    Send a new message
// @route   POST /api/messages
router.post('/', (req, res) => {
  res.json({
    success: true,
    message: 'Message sent successfully'
  });
});

// @desc    Get all conversations for current user
// @route   GET /api/messages/conversations
router.get('/conversations', (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

// @desc    Delete a message
// @route   DELETE /api/messages/:messageId
router.delete('/:messageId', async (req, res) => {
  console.log('🗑️ DELETE route hit for messageId:', req.params.messageId);
  console.log('🗑️ Full URL:', req.originalUrl);
  console.log('🗑️ Method:', req.method);

  try {
    const { messageId } = req.params;

    console.log('🗑️ Processing delete request for messageId:', messageId);

    if (!messageId) {
      console.log('🗑️ No messageId provided');
      return res.status(400).json({
        success: false,
        error: 'Message ID is required'
      });
    }

    // Check if this is a demo message (starts with "demo")
    if (messageId.startsWith('demo')) {
      console.log(`🗑️ Demo message deletion requested: ${messageId}`);

      // For demo messages, just return success since they don't exist in DB
      res.json({
        success: true,
        message: 'Demo message deleted successfully',
        messageId: messageId,
        isDemo: true
      });
      return;
    }

    // For real messages, check if they exist in database
    if (mongoose.connection.readyState === 1) {
      console.log('🗑️ Database connected, checking for message in DB');
      const Message = require('../models/Message');

      // Try to find the message first
      const message = await Message.findById(messageId);
      console.log('🗑️ Message found in DB:', !!message);

      if (!message) {
        console.log('🗑️ Message not found in database');
        return res.status(404).json({
          success: false,
          error: 'Message not found'
        });
      }

      // TODO: Add authorization check here - verify user can delete this message
      // For now, allow deletion of any message

      // Soft delete the message (mark as deleted instead of removing)
      message.isDeleted = true;
      message.deletedAt = new Date();
      await message.save();

      console.log(`🗑️ Message deleted from database: ${messageId}`);

      res.json({
        success: true,
        message: 'Message deleted successfully',
        messageId: messageId,
        isDemo: false
      });
    } else {
      console.log('🗑️ Database not connected');
      // Database not available, but still allow demo message deletion
      if (messageId.startsWith('demo')) {
        res.json({
          success: true,
          message: 'Demo message deleted successfully',
          messageId: messageId,
          isDemo: true,
          note: 'Database not available for real message deletion'
        });
      } else {
        res.status(503).json({
          success: false,
          error: 'Database not available for message deletion'
        });
      }
    }

  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete message',
      details: error.message
    });
  }
});

module.exports = router;
