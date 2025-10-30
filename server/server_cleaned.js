const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const path = require('path');
const multer = require('multer');
const { createServer } = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

// Create Express app
const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// File upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads/'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only images and videos are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 5
  }
});

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5176'];

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(cookieParser(process.env.JWT_SECRET));

// MongoDB connection options
const mongoOptions = {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
  dbName: 'PROMOTION',
  maxPoolSize: 10,
  w: 'majority',
  retryWrites: true
};

// Connect to MongoDB with retry logic
const connectWithRetry = async (retryCount = 0) => {
  const maxRetries = 3;
  const baseDelay = 1000;

  try {
    console.log(`Connecting to MongoDB...`);
    await mongoose.connect(process.env.MONGODB_URI, mongoOptions);
    console.log('MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    
    if (retryCount < maxRetries - 1) {
      const delay = baseDelay * Math.pow(2, retryCount) + Math.random() * 1000;
      console.log(`Retrying in ${Math.round(delay/1000)} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return connectWithRetry(retryCount + 1);
    } else {
      console.warn('MongoDB connection failed after all retries');
      return false;
    }
  }
};

// Routes
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  const fileInfo = {
    filename: req.file.filename,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    url: `/uploads/${req.file.filename}`
  };

  res.json({ success: true, data: fileInfo });
});

// Load routes with basic MongoDB check
const authRouter = require('./routes/auth');
app.use('/api/auth', (req, res, next) => {
  if (mongoose.connection.readyState !== 1 && req.path !== '/login' && req.path !== '/register') {
    return res.status(503).json({
      success: false,
      error: 'Database not available',
      mongodb_status: 'disconnected'
    });
  }
  next();
});
app.use('/api/auth', authRouter);

app.use('/api/messages', require('./routes/messageRoutes'));

app.use('/api/users', (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      error: 'Database not available',
      mongodb_status: 'disconnected'
    });
  }
  next();
});
app.use('/api/users', require('./routes/users'));

app.use('/api/jobs', (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      error: 'Database not available',
      mongodb_status: 'disconnected'
    });
  }
  next();
});
app.use('/api/jobs', require('./routes/jobRoutes'));

app.use('/api/posts', (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      error: 'Database not available',
      mongodb_status: 'disconnected'
    });
  }
  next();
});
app.use('/api/posts', require('./routes/postRoutes'));

// Socket.IO setup for real-time messaging
const setupSocketIO = (server) => {
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    transports: ['websocket', 'polling']
  });

  // Store connected users and missed messages
  const connectedUsers = new Map();
  const missedMessages = new Map();

  // Socket.IO middleware for authentication
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (jwtError) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // Track user connections
    if (!connectedUsers.has(socket.userId)) {
      connectedUsers.set(socket.userId, new Set());
    }
    connectedUsers.get(socket.userId).add(socket.id);

    // Broadcast user online status
    socket.broadcast.emit('user_online', { userId: socket.userId });

    // Send missed messages if any
    const userMissedMessages = missedMessages.get(socket.userId);
    if (userMissedMessages) {
      socket.emit('message_notification', {
        type: 'missed_messages',
        messages: userMissedMessages
      });
    }

    // Handle joining conversation room
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conversation_${conversationId}`);
      
      // Load existing messages from MongoDB if available
      if (mongoose.connection.readyState === 1) {
        const Message = require('./models/Message');
        Message.find({
          participants: { $all: conversationId.split('_').map(id => new mongoose.Types.ObjectId(id)) },
          isPartOfThread: true,
          isDeleted: { $ne: true }
        })
        .sort({ createdAt: 1 })
        .limit(50)
        .populate('sender', 'firstName lastName photo role')
        .populate('recipient', 'firstName lastName photo role')
        .then(messages => {
          if (messages.length > 0) {
            const formattedMessages = messages.map(msg => ({
              id: msg._id,
              conversationId,
              senderId: msg.sender._id,
              recipientId: msg.recipient._id,
              content: msg.content,
              timestamp: msg.createdAt,
              read: msg.isRead,
              sender: msg.sender,
              recipient: msg.recipient
            }));
            
            socket.emit('load_messages', { conversationId, messages: formattedMessages });
          } else {
            socket.emit('load_messages', { conversationId, messages: [] });
          }
        })
        .catch(() => {
          socket.emit('load_messages', { conversationId, messages: [] });
        });
      }
    });

    // Handle sending message
    socket.on('send_message', async (data) => {
      const { conversationId, content, recipientId, senderId } = data;

      if (!conversationId || !content || !recipientId || !senderId) {
        socket.emit('message_error', { error: 'Missing required fields' });
        return;
      }

      if (content.trim().length === 0) {
        socket.emit('message_error', { error: 'Message content cannot be empty' });
        return;
      }

      let savedMessage = null;
      if (mongoose.connection.readyState === 1) {
        const Message = require('./models/Message');
        
        // Get or create conversation
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
            content: 'Conversation started',
            isPartOfThread: false
          });
        }

        // Create and save message
        const message = new Message({
          participants: [new mongoose.Types.ObjectId(senderId), new mongoose.Types.ObjectId(recipientId)],
          sender: new mongoose.Types.ObjectId(senderId),
          recipient: new mongoose.Types.ObjectId(recipientId),
          content: content.trim(),
          isRead: false,
          isPartOfThread: true,
          conversationId: conversation._id
        });

        savedMessage = await message.save();
        savedMessage = await Message.findById(savedMessage._id)
          .populate('sender', 'firstName lastName photo role')
          .populate('recipient', 'firstName lastName photo role');
      }

      if (savedMessage) {
        const messageData = {
          id: savedMessage._id,
          conversationId,
          senderId,
          recipientId,
          content: content.trim(),
          timestamp: savedMessage.createdAt,
          read: false,
          sender: savedMessage.sender || null,
          recipient: savedMessage.recipient || null
        };

        // Emit to conversation room
        io.to(`conversation_${conversationId}`).emit('new_message', messageData);

        // Check if recipient is online
        const isRecipientOnline = connectedUsers.get(recipientId)?.size > 0;

        if (!isRecipientOnline) {
          // Store as missed message
          if (!missedMessages.has(recipientId)) {
            missedMessages.set(recipientId, []);
          }
          missedMessages.get(recipientId).push({
            id: savedMessage._id,
            conversationId,
            senderId,
            content: content.trim(),
            timestamp: savedMessage.createdAt,
            sender: savedMessage.sender
          });
        }

        // Emit confirmation to sender
        socket.emit('message_sent', {
          id: messageData.id,
          conversationId,
          senderId,
          recipientId,
          content: messageData.content,
          timestamp: messageData.timestamp,
          read: false,
          confirmed: true,
          recipientOnline: isRecipientOnline
        });

        // Send notification to recipient if online
        if (isRecipientOnline) {
          const recipientSocketIds = connectedUsers.get(recipientId);
          if (recipientSocketIds) {
            recipientSocketIds.forEach(socketId => {
              const recipientSocket = io.sockets.sockets.get(socketId);
              if (recipientSocket && recipientSocket.userId === recipientId) {
                recipientSocket.emit('new_message_notification', {
                  type: 'new_message',
                  senderId,
                  senderName: savedMessage.sender ? `${savedMessage.sender.firstName} ${savedMessage.sender.lastName}` : 'Someone',
                  messageContent: content.trim(),
                  conversationId,
                  messageId: savedMessage._id,
                  timestamp: savedMessage.createdAt
                });
              }
            });
          }
        }
      } else {
        socket.emit('message_error', { error: 'Message save failed' });
      }
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      const { conversationId } = data;
      socket.to(`conversation_${conversationId}`).emit('user_typing', { userId: socket.userId, typing: true });
    });

    socket.on('typing_stop', (data) => {
      const { conversationId } = data;
      socket.to(`conversation_${conversationId}`).emit('user_typing', { userId: socket.userId, typing: false });
    });

    // Handle message deletion
    socket.on('delete_message', async (data) => {
      const { messageId, conversationId, deletedBy } = data;

      if (!messageId || !conversationId || !deletedBy) {
        socket.emit('message_error', { error: 'Missing required fields for deletion' });
        return;
      }

      if (mongoose.connection.readyState === 1) {
        const Message = require('./models/Message');
        
        const message = await Message.findById(messageId);
        if (!message) {
          socket.emit('message_error', { error: 'Message not found' });
          return;
        }

        // Check permission
        const isSender = message.sender.toString() === deletedBy;
        const isRecipient = message.recipient.toString() === deletedBy;
        
        if (!isSender && !isRecipient) {
          socket.emit('message_error', { error: 'Unauthorized' });
          return;
        }

        // Soft delete
        message.isDeleted = true;
        message.deletedAt = new Date();
        await message.save();

        // Broadcast deletion
        io.to(`conversation_${conversationId}`).emit('message_deleted', {
          messageId,
          conversationId,
          deletedBy,
          timestamp: new Date()
        });

        socket.emit('message_deleted', { messageId, conversationId, deletedBy, success: true });
      }
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
      if (connectedUsers.has(socket.userId)) {
        const userConnections = connectedUsers.get(socket.userId);
        userConnections.delete(socket.id);

        if (userConnections.size === 0) {
          connectedUsers.delete(socket.userId);
          socket.broadcast.emit('user_offline', { userId: socket.userId });
        }
      }
    });
  });

  return io;
};

// API endpoint to retrieve missed messages
app.get('/api/missed-messages/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (mongoose.connection.readyState === 1) {
      const Message = require('./models/Message');
      const missedMsgs = await Message.find({
        recipient: new mongoose.Types.ObjectId(userId),
        isRead: false,
        isPartOfThread: true,
        isDeleted: { $ne: true }
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('sender', 'firstName lastName photo role')
      .populate('recipient', 'firstName lastName photo role');

      const formattedMessages = missedMsgs.map(msg => ({
        id: msg._id,
        conversationId: `${msg.sender._id}_${msg.recipient._id}`,
        senderId: msg.sender._id,
        recipientId: msg.recipient._id,
        content: msg.content,
        timestamp: msg.createdAt,
        read: msg.isRead,
        sender: msg.sender || null,
        recipient: msg.recipient || null
      }));

      res.json({ success: true, count: formattedMessages.length, messages: formattedMessages });
    } else {
      res.status(503).json({ success: false, error: 'Database not available' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve missed messages' });
  }
});

// API endpoint to mark missed messages as read
app.post('/api/mark-missed-messages-read/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (missedMessages.has(userId)) {
      missedMessages.delete(userId);
    }

    if (mongoose.connection.readyState === 1) {
      const Message = require('./models/Message');
      await Message.updateMany(
        {
          recipient: new mongoose.Types.ObjectId(userId),
          isRead: false,
          isDeleted: { $ne: true }
        },
        { isRead: true }
      );

      res.json({ success: true, message: 'Missed messages marked as read' });
    } else {
      res.json({ 
        success: true, 
        message: 'Missed messages cleared from memory',
        note: 'Database not available to mark messages as read'
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to mark messages as read' });
  }
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Not Found - ${req.originalUrl}` });
});

// Main server startup function
const startServer = async () => {
  const PORT = parseInt(process.env.PORT, 10) || 5000;
  const HOST = '127.0.0.1';

  const server = createServer(app);
  setupSocketIO(server);

  server.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use`);
    } else {
      console.error('Server error:', error);
    }
    process.exit(1);
  });

  // Handle process termination
  const shutdown = async () => {
    console.log('Shutting down server...');
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await connectWithRetry();
};

startServer();