// Test route for direct database save (add to server.js)
app.post('/api/test-direct-save', async (req, res) => {
  console.log('🧪 Direct database save test');
  console.log('📨 Request body:', req.body);

  const { content, senderId, recipientId } = req.body;

  if (!content || !senderId || !recipientId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: content, senderId, recipientId'
    });
  }

  try {
    if (mongoose.connection.readyState === 1) {
      const Message = require('./models/Message');

      // Create conversation first
      const participants = [senderId, recipientId].sort();
      let conversation = await Message.findOne({
        participants: { $all: participants.map(id => new mongoose.Types.ObjectId(id)), $size: participants.length },
        isPartOfThread: false
      });

      if (!conversation) {
        conversation = await Message.create({
          participants: participants.map(id => new mongoose.Types.ObjectId(id)),
          sender: new mongoose.Types.ObjectId(senderId),
          recipient: new mongoose.Types.ObjectId(recipientId),
          content: 'Test conversation',
          isPartOfThread: false
        });
        console.log(`✅ Created test conversation: ${conversation._id}`);
      }

      // Create and save message
      const message = new Message({
        participants: [new mongoose.Types.ObjectId(senderId), new mongoose.Types.ObjectId(recipientId)],
        sender: new mongoose.Types.ObjectId(senderId),
        recipient: new mongoose.Types.ObjectId(recipientId),
        content: content,
        isRead: false,
        isPartOfThread: true,
        conversationId: conversation._id
      });

      const savedMessage = await message.save();
      console.log(`✅ Message directly saved to MongoDB: ${savedMessage._id}`);

      // Verify it exists
      const foundMessage = await Message.findById(savedMessage._id);
      console.log(`🔍 Verification - message found:`, !!foundMessage);

      res.json({
        success: true,
        message: 'Message saved successfully',
        data: {
          messageId: savedMessage._id,
          content: savedMessage.content,
          verified: !!foundMessage
        }
      });
    } else {
      res.status(503).json({
        success: false,
        error: 'MongoDB not connected',
        readyState: mongoose.connection.readyState
      });
    }
  } catch (error) {
    console.error('❌ Direct save error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});
