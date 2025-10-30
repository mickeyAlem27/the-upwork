const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  
  isRead: {
    type: Boolean,
    default: false
  },
  
  isPartOfThread: {
    type: Boolean,
    default: true
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  
  // Soft delete fields
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better query performance
messageSchema.index({ participants: 1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, isRead: 1 });

module.exports = mongoose.model('Message', messageSchema);