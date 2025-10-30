const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// @desc    Delete a message
// @route   DELETE /api/messages/:messageId
router.delete('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;

    if (!messageId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Message ID is required' 
      });
    }

    // For real messages, check if they exist in database
    if (mongoose.connection.readyState === 1) {
      const Message = require('../models/Message');

      // Try to find the message first
      const message = await Message.findById(messageId);

      if (!message) {
        return res.status(404).json({ 
          success: false, 
          error: 'Message not found' 
        });
      }

      // Check permission
      const isSender = message.sender.toString() === req.user.id;
      const isRecipient = message.recipient.toString() === req.user.id;
      
      if (!isSender && !isRecipient) {
        return res.status(403).json({ 
          success: false, 
          error: 'Unauthorized to delete this message' 
        });
      }

      // Soft delete the message
      message.isDeleted = true;
      message.deletedAt = new Date();
      await message.save();

      res.json({ 
        success: true, 
        message: 'Message deleted successfully', 
        messageId: messageId 
      });
    } else {
      res.status(503).json({ 
        success: false, 
        error: 'Database not available for message deletion' 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete message', 
      details: error.message 
    });
  }
});

module.exports = router;