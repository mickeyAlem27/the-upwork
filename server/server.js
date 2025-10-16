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
const ErrorResponse = require('./utils/errorResponse');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please create a .env file with the required variables.');
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
  // Accept images and videos
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
    fileSize: 50 * 1024 * 1024, // 50MB limit for videos
    files: 5 // Maximum 5 files at once
  }
});

// Serve uploaded files statically (before CORS to avoid blocking static files)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Add CORS headers specifically for uploaded files
app.use('/uploads', (req, res, next) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5176'];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5176', 'http://127.0.0.1:5173'];

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS with options
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use(cookieParser(process.env.JWT_SECRET));

// MongoDB connection options - Optimized for network changes
const mongoOptions = {
  serverSelectionTimeoutMS: 30000, // Reduced for faster failure detection
  socketTimeoutMS: 45000, // Increased for stability
  connectTimeoutMS: 30000, // Reduced for faster connection attempts
  heartbeatFrequencyMS: 10000, // More frequent heartbeats
  family: 4,
  dbName: 'PROMOTION',
  maxPoolSize: 10,
  minPoolSize: 1,
  maxIdleTimeMS: 30000,
  waitQueueTimeoutMS: 20000,
  w: 'majority',
  retryWrites: true,
  retryReads: true,
  autoIndex: false,
  tls: true,
  tlsAllowInvalidCertificates: false,
  authSource: 'admin'
};

// Enable Mongoose debug mode in development
if (process.env.NODE_ENV === 'development') {
  mongoose.set('debug', (collectionName, method, query, doc) => {
    console.log(`Mongoose: ${collectionName}.${method}`, JSON.stringify(query), doc);
  });
}

// Setup MongoDB connection event listeners
const setupMongooseListeners = () => {
  const db = mongoose.connection;
  
  db.on('connected', () => {
    console.log('✅ MongoDB connected successfully');
    console.log('📊 Database name:', db.name);
    console.log('📡 Connection host:', db.host);
    console.log('🔌 Connection port:', db.port);
  });

  db.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err.message);
  });

  db.on('disconnected', () => {
    console.log('ℹ️ MongoDB disconnected');
  });

  db.on('reconnected', () => {
  });
};

// Connect to MongoDB with enhanced options and retry logic for network resilience
const connectWithRetry = async (retryCount = 0) => {
  const maxRetries = 3; // Increased retries for better resilience
  const baseDelay = 1000; // Reduced base delay for faster retries

  try {
    console.log(`🔗 Attempting to connect to MongoDB (Attempt ${retryCount + 1}/${maxRetries})...`);
    console.log(`📡 Connecting to: ${process.env.MONGODB_URI ? 'MongoDB Atlas' : 'No URI provided'}`);

    // Setup event listeners only on first attempt
    if (retryCount === 0) {
      setupMongooseListeners();
    }

    // Connect to MongoDB with a timeout
    const connectPromise = mongoose.connect(process.env.MONGODB_URI, mongoOptions);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection timeout after 30 seconds')), 30000)
    );

    const conn = await Promise.race([connectPromise, timeoutPromise]);

    // Verify the connection
    console.log('✅ Successfully connected to MongoDB');
    console.log(`🛢️  Database: ${conn.connection.db.databaseName}`);
    console.log(`🌐 Host: ${conn.connection.host}:${conn.connection.port}`);

    // Handle collections setup
    await setupCollections(conn);

    return conn;

  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);

    // Enhanced error logging for network issues
    if (error.name === 'MongoServerError') {
      console.error('🔍 MongoDB Server Error:', error.codeName, '-', error.message);
      if (error.code === 8000) {
        console.error('  - Authentication failed. Please check your username and password.');
      }
    } else if (error.name === 'MongooseServerSelectionError') {
      console.error('🔍 Network Connection Error:', error.message);
      console.error('  - This usually means network connectivity issues or IP whitelist problems');
      console.error('  - MongoDB Atlas may have blocked your IP address');
      console.error('  - Please check your MongoDB Atlas Network Access settings');
      console.error('  - For development, consider using 0.0.0.0/0 (Allow All) in Network Access');
      console.error('  - Or use a local MongoDB instance for development');
    } else if (error.message.includes('ETIMEOUT') || error.message.includes('timeout')) {
      console.error('⏱️  Connection timeout - Network connectivity issues');
      console.error('  - Check your internet connection');
      console.error('  - MongoDB Atlas cluster might be experiencing issues');
      console.error('  - Firewall or network restrictions may be blocking the connection');
    } else if (error.message === 'Connection timeout after 30 seconds') {
      console.error('⏱️  Connection attempt timed out after 30 seconds');
    }

    // For Socket.IO demo, continue without MongoDB if retries fail
    if (retryCount < maxRetries - 1) {
      const delay = baseDelay * Math.pow(2, retryCount) + Math.random() * 1000; // Exponential backoff

      console.log(`🔄 Retrying MongoDB connection in ${Math.round(delay/1000)} seconds... (${retryCount + 2}/${maxRetries})`);

      await new Promise(resolve => setTimeout(resolve, delay));
      return connectWithRetry(retryCount + 1);
    } else {
      console.warn('⚠️  MongoDB connection failed after all retries, but Socket.IO server will continue');
      console.warn('🔗 Socket.IO server is still running for real-time messaging');
      console.warn('⚠️  Authentication routes will not work without MongoDB');
      console.warn('💡 To fix MongoDB connection issues:');
      console.warn('   1. Check your internet connection');
      console.warn('   2. Verify MongoDB Atlas cluster is running');
      console.warn('   3. In MongoDB Atlas Network Access, add your current IP or use 0.0.0.0/0');
      console.warn('   4. Verify username/password in connection string');
      console.warn('   5. Try using a local MongoDB instance for development');
      console.warn('   6. Check if your firewall is blocking outbound connections');
      return null; // Continue without MongoDB for Socket.IO demo
    }
  }
};

// Setup required collections
const setupCollections = async (conn) => {
  try {
    const collections = await conn.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log('📋 Available collections:', collectionNames);
    
    // Check if required collections exist
    const requiredCollections = ['users', 'messages', 'conversations', 'posts', 'jobs'];
    const missingCollections = requiredCollections.filter(c => !collectionNames.includes(c));
    
    if (missingCollections.length > 0) {
      console.warn('⚠️  Missing collections:', missingCollections);
      
      // Create missing collections if they don't exist
      const db = conn.connection.db;
      for (const collName of missingCollections) {
        try {
          await db.createCollection(collName);
          console.log(`✅ Created collection: ${collName}`);
        } catch (createErr) {
          console.warn(`⚠️  Could not create collection ${collName}:`, createErr.message);
        }
      }
    }
  } catch (error) {
    console.warn('⚠️  Could not set up collections:', error.message);
    // Continue even if we can't set up collections
  }
};

// Routes (load immediately with MongoDB availability checks)
console.log('🔗 Loading API routes...');

try {
  // File upload route (doesn't need MongoDB)
  app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
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
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ success: false, error: 'File upload failed' });
    }
  });
  console.log('✅ File upload route loaded');
} catch (error) {
  console.error('❌ Failed to load file upload route:', error.message);
}

// Load authentication routes (with MongoDB availability handling)
try {
  const authRouter = require('./routes/auth');

  // Wrap auth routes with MongoDB availability middleware
  app.use('/api/auth', (req, res, next) => {
    // For public routes (login, register), check MongoDB availability
    if ((req.path === '/login' || req.path === '/register') && mongoose.connection.readyState !== 1) {
      console.log('🔐 MongoDB not connected, but allowing auth routes for demo mode');
      // Continue to next middleware (the actual route handlers)
      return next();
    }
    // For protected routes, check MongoDB availability
    if (req.path !== '/login' && req.path !== '/register' && mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not available. Authentication features require database connection.',
        mongodb_status: 'disconnected'
      });
    }
    next();
  });

  app.use('/api/auth', authRouter);
  console.log('✅ Auth routes loaded (with MongoDB availability checks)');
} catch (error) {
  console.error('❌ Failed to load auth routes:', error.message);
}

// Load messages routes with MongoDB availability middleware
try {
  const messageRoutes = require('./routes/messageRoutes');

  app.use('/api/messages', messageRoutes);
  console.log('✅ Messages routes loaded');
} catch (error) {
  console.error('❌ Failed to load messages routes:', error.message);
}

// Load user routes with MongoDB availability middleware
try {
  app.use('/api/users', (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not available. User management requires database connection.',
        mongodb_status: 'disconnected'
      });
    }
    next();
  });

  app.use('/api/users', require('./routes/users'));
  console.log('✅ Users routes loaded');
} catch (error) {
  console.error('❌ Failed to load users routes:', error.message);
}

// Load jobs routes with MongoDB availability middleware
try {
  app.use('/api/jobs', (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not available. Job management requires database connection.',
        mongodb_status: 'disconnected'
      });
    }
    next();
  });

  app.use('/api/jobs', require('./routes/jobRoutes'));
  console.log('✅ Jobs routes loaded');
} catch (error) {
  console.error('❌ Failed to load jobs routes:', error.message);
}

console.log('✅ API routes loading completed');

// Socket.IO setup for real-time messaging
const setupSocketIO = (server) => {
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    transports: ['websocket', 'polling']
  });

  // Store connected users and their socket connections
  const connectedUsers = new Map(); // userId -> Set of socketIds
  const socketToUser = new Map(); // socketId -> userId

  // Store missed messages for offline users
  const missedMessages = new Map(); // userId -> Array of missed messages

  // Socket.IO middleware for authentication (with demo mode fallback)
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.userEmail = decoded.email;
        socket.isDemo = false;
        next();
      } catch (jwtError) {
        return next(new Error('Invalid token'));
      }
    } catch (error) {
      return next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔗 Socket connected: ${socket.id}`);

    // Handle user identification after connection (for additional user data)
    socket.on('user_identify', (data) => {
      if (data.userId && data.email) {
        socket.userId = data.userId;
        socket.userEmail = data.email;
        socket.isDemo = false;
      }
    });

    console.log(`🔗 User ${socket.userId} connected via Socket.IO`);

    // Track user connections properly (handle multiple tabs/windows)
    if (!connectedUsers.has(socket.userId)) {
      connectedUsers.set(socket.userId, new Set());
    }
    connectedUsers.get(socket.userId).add(socket.id);
    socketToUser.set(socket.id, socket.userId);

    // Broadcast authenticated user online status to all other users
    socket.broadcast.emit('user_online', {
      userId: socket.userId,
      timestamp: new Date(),
      isDemo: socket.isDemo || false,
      isExisting: connectedUsers.get(socket.userId).size > 1 // True if user had other connections
    });

    // Send current online users to this newly connected user
    const currentUsers = Array.from(connectedUsers.keys()).filter(id => id !== socket.userId);
    if (currentUsers.length > 0) {
      currentUsers.forEach(userId => {
        const userConnections = connectedUsers.get(userId);
        if (userConnections && userConnections.size > 0) {
          socket.emit('user_online', {
            userId,
            timestamp: new Date(),
            isDemo: false,
            isExisting: true
          });
        }
      });
    }

    // Also send the current user's own online status to themselves
    const userMissedCount = missedMessages.has(socket.userId) ? missedMessages.get(socket.userId).length : 0;

    console.log(`🔗 User ${socket.userId} connecting with ${userMissedCount} missed messages`);

    socket.emit('user_online', {
      userId: socket.userId,
      timestamp: new Date(),
      isDemo: socket.isDemo || false,
      isSelf: true,
      missedMessageCount: userMissedCount
    });

    console.log(`📨 Sent user_online event to ${socket.userId} with missedMessageCount: ${userMissedCount}`);

    // Send missed message count update to the user themselves
    if (userMissedCount > 0) {
      socket.emit('missed_message_count_updated', {
        userId: socket.userId,
        missedMessageCount: userMissedCount,
        timestamp: new Date()
      });
      console.log(`📨 Sent missed_message_count_updated to user ${socket.userId} themselves`);
    }

    // Check for missed messages and send notifications
    const userMissedMessages = missedMessages.get(socket.userId);
    if (userMissedMessages && userMissedMessages.length > 0) {
      console.log(`📬 User ${socket.userId} has ${userMissedMessages.length} missed messages`);

      // Group messages by sender for better notifications
      const messagesBySender = {};
      userMissedMessages.forEach(msg => {
        if (!messagesBySender[msg.senderId]) {
          messagesBySender[msg.senderId] = [];
        }
        messagesBySender[msg.senderId].push(msg);
      });

      // Send individual notifications for each sender
      Object.entries(messagesBySender).forEach(([senderId, messages]) => {
        const senderInfo = messages[0].sender;
        const senderName = senderInfo ? `${senderInfo.firstName} ${senderInfo.lastName}` : 'Someone';

        socket.emit('message_notification', {
          type: 'missed_message',
          senderId: senderId,
          senderName: senderName,
          messageCount: messages.length,
          latestMessage: messages[messages.length - 1].content,
          conversationId: messages[0].conversationId,
          timestamp: new Date()
        });

        console.log(`📨 Sent message_notification to ${socket.userId} for sender ${senderName} (${messages.length} messages)`);
      });

      // Don't clear missed messages immediately - let user retrieve them first
      // They will be cleared when user actually retrieves the messages
    }

    // Handle joining conversation room
    socket.on('join_conversation', async (conversationId) => {
      try {
        socket.join(`conversation_${conversationId}`);

        // Extract participant IDs from conversationId (format: "userId1_userId2")
        const participantIds = conversationId.split('_');
        if (participantIds.length !== 2) {
          return;
        }

        const [userId1, userId2] = participantIds;

        // Load existing messages from MongoDB if available
        try {
          if (mongoose.connection.readyState === 1) {
            const Message = require('./models/Message');

            const participants = [userId1, userId2].sort();
            const conversation = await Message.findOne({
              participants: { $all: participants.map(id => new mongoose.Types.ObjectId(id)), $size: participants.length },
              isPartOfThread: false
            });

            if (conversation) {
              const existingMessages = await Message.find({
                conversationId: conversation._id,
                isPartOfThread: true
              })
              .sort({ createdAt: -1 })
              .limit(50)
              .populate('sender', 'firstName lastName photo role')
              .populate('recipient', 'firstName lastName photo role');

              if (existingMessages.length > 0) {
                const messagesForClient = existingMessages.reverse().map(msg => ({
                  id: msg._id,
                  conversationId: conversationId,
                  senderId: msg.sender?._id || msg.sender,
                  recipientId: msg.recipient?._id || msg.recipient,
                  content: msg.content,
                  timestamp: msg.createdAt,
                  read: msg.isRead,
                  sender: msg.sender || null,
                  recipient: msg.recipient || null
                }));

                socket.emit('load_messages', {
                  conversationId,
                  messages: messagesForClient,
                  hasMessages: messagesForClient.length > 0
                });
              } else {
                socket.emit('load_messages', {
                  conversationId,
                  messages: [],
                  hasMessages: false
                });
              }
            } else {
              socket.emit('load_messages', {
                conversationId,
                messages: [],
                hasMessages: false,
                isNewConversation: true
              });
            }
          } else {
            socket.emit('load_messages', {
              conversationId,
              messages: [],
              hasMessages: false,
              dbConnected: false
            });
          }
        } catch (dbError) {
          socket.emit('load_messages', {
            conversationId,
            messages: [],
            hasMessages: false,
            error: true
          });
        }
      } catch (error) {
        // Silent fail for conversation joining
      }
    });

    // Handle loading conversation messages
    socket.on('load_conversation_messages', async (data) => {
      try {
        const { conversationId } = data;

        if (!conversationId) {
          socket.emit('message_error', {
            error: 'Missing conversation ID',
            details: 'conversationId is required'
          });
          return;
        }

        // For demo purposes, we'll return sample messages if database is not available
        if (mongoose.connection.readyState !== 1) {
          console.log(`📨 Loading demo messages for conversation ${conversationId}`);

          // Send sample messages for demo
          const demoMessages = [
            {
              id: 'demo1',
              conversationId,
              senderId: conversationId.split('_')[0] === socket.userId ? conversationId.split('_')[1] : conversationId.split('_')[0],
              recipientId: socket.userId,
              content: 'Hey! How are you doing?',
              timestamp: new Date(Date.now() - 3600000), // 1 hour ago
              read: false,
              sender: null,
              recipient: null
            },
            {
              id: 'demo2',
              conversationId,
              senderId: socket.userId,
              recipientId: conversationId.split('_')[0] === socket.userId ? conversationId.split('_')[1] : conversationId.split('_')[0],
              content: 'I am doing great! Thanks for asking.',
              timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
              read: true,
              sender: null,
              recipient: null
            }
          ];

          socket.emit('load_messages', {
            conversationId,
            messages: demoMessages,
            timestamp: new Date()
          });

          return;
        }

        // Load messages from database
        const Message = require('./models/Message');

        // Parse conversation participants
        const participants = conversationId.split('_').map(id => new mongoose.Types.ObjectId(id));

        // Find conversation first
        const conversation = await Message.findOne({
          participants: { $all: participants, $size: participants.length },
          isPartOfThread: false
        });

        if (!conversation) {
          // No conversation exists yet, send empty messages
          socket.emit('load_messages', {
            conversationId,
            messages: [],
            timestamp: new Date()
          });
          return;
        }

        // Find all messages in this conversation thread
        const messages = await Message.find({
          participants: { $all: participants, $size: participants.length },
          isPartOfThread: true
        })
        .sort({ createdAt: 1 })
        .limit(50) // Limit to last 50 messages
        .populate('sender', 'firstName lastName photo role')
        .populate('recipient', 'firstName lastName photo role');

        // Format messages for client
        const formattedMessages = messages.map(msg => ({
          id: msg._id,
          conversationId: conversationId,
          senderId: msg.sender._id,
          recipientId: msg.recipient._id,
          content: msg.content,
          timestamp: msg.createdAt,
          read: msg.isRead,
          sender: msg.sender || null,
          recipient: msg.recipient || null
        }));

        console.log(`📨 Loaded ${formattedMessages.length} messages for conversation ${conversationId}`);

        // Send messages to client
        socket.emit('load_messages', {
          conversationId,
          messages: formattedMessages,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Error loading conversation messages:', error);
        socket.emit('message_error', {
          error: 'Failed to load messages',
          details: error.message
        });
      }
    });

    // Handle sending message
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, content, recipientId, senderId } = data;

        // Validate required fields
        if (!conversationId || !content || !recipientId || !senderId) {
          socket.emit('message_error', {
            error: 'Missing required fields',
            details: 'conversationId, content, recipientId, and senderId are required'
          });
          return;
        }

        // Validate message content
        if (content.trim().length === 0) {
          socket.emit('message_error', { error: 'Message content cannot be empty' });
          return;
        }

        // For demo purposes, we'll save to MongoDB if available
        let savedMessage = null;
        try {
          if (mongoose.connection.readyState === 1) {
            const Message = require('./models/Message');

            // Get or create conversation
            const participants = [senderId, recipientId].sort();

            let conversation;
            try {
              conversation = await Message.findOne({
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
            } catch (convError) {
              throw convError;
            }

            // Create and save the message
            const message = new Message({
              participants: [new mongoose.Types.ObjectId(senderId), new mongoose.Types.ObjectId(recipientId)],
              sender: new mongoose.Types.ObjectId(senderId),
              recipient: new mongoose.Types.ObjectId(recipientId),
              content: content.trim(),
              isRead: false,
              isPartOfThread: true,
              conversationId: conversation._id
            });

            try {
              savedMessage = await message.save();
            } catch (saveError) {
              throw saveError;
            }

            // Update conversation's last message
            try {
              conversation.lastMessage = savedMessage._id;
              conversation.unreadCount = (conversation.unreadCount || 0) + 1;
              await conversation.save();
            } catch (convUpdateError) {
              // Don't throw - message is saved, conversation update failure is not critical
            }

            // Populate the saved message for broadcasting
            try {
              savedMessage = await Message.findById(savedMessage._id)
                .populate('sender', 'firstName lastName photo role')
                .populate('recipient', 'firstName lastName photo role');
            } catch (populateError) {
              // Use unpopulated message if population fails
            }
          } else {
            socket.emit('message_error', {
              error: 'Database not connected',
              details: 'Messages cannot be persisted without database connection'
            });
            return;
          }
        } catch (dbError) {
          socket.emit('message_error', {
            error: 'Failed to save message',
            details: 'Message could not be persisted to database'
          });
          return;
        }

        // Only broadcast if message was successfully saved
        if (savedMessage) {
          // Validate that the conversation room exists
          const roomName = `conversation_${conversationId}`;

          // Check if recipient is currently online
          const recipientSockets = connectedUsers.get(recipientId);
          const isRecipientOnline = recipientSockets && recipientSockets.size > 0;

          // Create message object for broadcasting
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

          // Emit message to conversation room (including sender for confirmation)
          io.to(roomName).emit('new_message', messageData);

          // If recipient is not online, store as missed message
          if (!isRecipientOnline) {
            if (!missedMessages.has(recipientId)) {
              missedMessages.set(recipientId, []);
            }
            missedMessages.get(recipientId).push({
              id: savedMessage._id,
              conversationId,
              senderId,
              content: content.trim(),
              timestamp: savedMessage.createdAt,
              sender: savedMessage.sender || null
            });

            console.log(`📬 Message stored as missed for offline user: ${recipientId}`);

            // Notify all users who can see this user's status about the updated count
            // This allows the frontend to update notification badges
            const updatedCount = missedMessages.get(recipientId).length;
            console.log(`📬 Broadcasting missed message count update for user ${recipientId}: ${updatedCount}`);

            // Send to all connected users EXCEPT the recipient (they'll get it when they connect)
            // This ensures other users can see the updated count in their user lists
            io.sockets.sockets.forEach((socket) => {
              if (socket.userId && socket.userId !== recipientId) {
                socket.emit('missed_message_count_updated', {
                  userId: recipientId,
                  missedMessageCount: updatedCount,
                  timestamp: new Date()
                });
              }
            });

            console.log(`📨 Broadcast missed_message_count_updated event for user ${recipientId}`);
          }

          // Also emit confirmation to sender
          socket.emit('message_sent', {
            id: messageData.id,
            conversationId,
            senderId,
            recipientId,
            content: messageData.content,
            timestamp: messageData.timestamp,
            read: false,
            confirmed: true,
            recipientOnline: isRecipientOnline,
            storedAsMissed: !isRecipientOnline
          });

          // If recipient is online, send real-time notification
          if (isRecipientOnline) {
            // Send notification to recipient about new message
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
          socket.emit('message_error', {
            error: 'Message save failed',
            details: 'Message was not saved to database'
          });
        }

      } catch (error) {
        socket.emit('message_error', {
          error: 'Failed to process message',
          details: error.message
        });
      }
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      const { conversationId, recipientId } = data;
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        userId: socket.userId,
        conversationId,
        typing: true
      });
    });

    socket.on('typing_stop', (data) => {
      const { conversationId, recipientId } = data;
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        userId: socket.userId,
        conversationId,
        typing: false
      });
    });

    // Handle dismissing/clearing notification count
    socket.on('clear_notification_count', (data) => {
      const { userId } = data;

      if (userId === socket.userId && missedMessages.has(userId)) {
        const clearedCount = missedMessages.get(userId).length;
        missedMessages.delete(userId);

        console.log(`🧹 User ${userId} cleared ${clearedCount} notification badges`);

        // Notify all users about the updated count (now 0)
        io.emit('missed_message_count_updated', {
          userId: userId,
          missedMessageCount: 0,
          timestamp: new Date()
        });

        console.log(`📨 Broadcast notification count cleared for user ${userId}`);
      }
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
      if (socket.userId && connectedUsers.has(socket.userId)) {
        const userConnections = connectedUsers.get(socket.userId);
        userConnections.delete(socket.id);

        // Only mark user as offline if they have no more connections
        if (userConnections.size === 0) {
          connectedUsers.delete(socket.userId);
          socketToUser.delete(socket.id);

          // Broadcast user offline status to all other users
          socket.broadcast.emit('user_offline', {
            userId: socket.userId,
            timestamp: new Date(),
            isDemo: false
          });
        }
      }
    });
  });

  // Clean up disconnected users periodically
  setInterval(() => {
    for (const [userId, userConnections] of connectedUsers.entries()) {
      // Remove any stale connections
      for (const socketId of userConnections) {
        if (!io.sockets.sockets.get(socketId)) {
          userConnections.delete(socketId);
        }
      }

      // If user has no active connections, mark as offline
      if (userConnections.size === 0) {
        connectedUsers.delete(userId);
        io.emit('user_offline', {
          userId,
          timestamp: new Date(),
          isDemo: false
        });
      }
    }
  }, 60000);
};



// API endpoint to retrieve missed messages
app.get('/api/missed-messages/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (mongoose.connection.readyState === 1) {
      const Message = require('./models/Message');

      // Find all messages where this user is the recipient and hasn't read them
      const missedMsgs = await Message.find({
        recipient: new mongoose.Types.ObjectId(userId),
        isRead: false,
        isPartOfThread: true
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('sender', 'firstName lastName photo role')
      .populate('recipient', 'firstName lastName photo role');

      // Format messages for client
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

      res.json({
        success: true,
        count: formattedMessages.length,
        messages: formattedMessages
      });
    } else {
      res.status(503).json({
        success: false,
        error: 'Database not available',
        message: 'Cannot retrieve missed messages without database connection'
      });
    }
  } catch (error) {
    console.error('Error retrieving missed messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve missed messages',
      details: error.message
    });
  }
});

// API endpoint to mark missed messages as read (clears notifications)
app.post('/api/mark-missed-messages-read/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Clear missed messages from memory
    if (missedMessages.has(userId)) {
      const clearedCount = missedMessages.get(userId).length;
      missedMessages.delete(userId);
      console.log(`🧹 Cleared ${clearedCount} missed message notifications for user ${userId}`);

      // Notify all users about the updated count (now 0)
      io.emit('missed_message_count_updated', {
        userId: userId,
        missedMessageCount: 0,
        timestamp: new Date()
      });

      console.log(`📨 API: Broadcast notification count cleared for user ${userId}`);
    }

    // If database is available, mark messages as read
    if (mongoose.connection.readyState === 1) {
      const Message = require('./models/Message');

      // Mark unread messages as read for this user
      const result = await Message.updateMany(
        {
          recipient: new mongoose.Types.ObjectId(userId),
          isRead: false
        },
        { isRead: true }
      );

      res.json({
        success: true,
        message: 'Missed messages marked as read',
        clearedFromMemory: true,
        markedAsReadInDb: result.modifiedCount
      });
    } else {
      res.json({
        success: true,
        message: 'Missed messages cleared from memory',
        clearedFromMemory: true,
        note: 'Database not available to mark messages as read'
      });
    }
  } catch (error) {
    console.error('Error marking missed messages as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark missed messages as read',
      details: error.message
    });
  }
});

// Handle 404 - Route not found
app.use((req, res, next) => {
  next(new ErrorResponse(`Not Found - ${req.originalUrl}`, 404));
});

// Main server startup function
const startServer = async () => {
  try {
    // Port configuration
    const PORT = parseInt(process.env.PORT, 10) || 5000;
    const HOST = '127.0.0.1'; // Explicitly use localhost

    // Create HTTP server
    const server = createServer(app);

    // Setup Socket.IO
    const io = setupSocketIO(server);

    // Start the HTTP server with Socket.IO
    server.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on http://${HOST}:${PORT}`);
      console.log('✅ Server started successfully!');
      console.log(`🔌 Socket.IO server is running on port ${PORT}`);
      console.log(`📡 WebSocket endpoint: ws://${HOST}:${PORT}`);
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please free the port and try again.`);
      } else {
        console.error('Server error:', error);
      }
      process.exit(1);
    });

    // Handle process termination
    const shutdown = async () => {
      console.log('\n🛑 Shutting down server...');

      // Close Socket.IO connections
      io.close();

      // Close HTTP server
      server.close(async () => {
        console.log('✅ HTTP server stopped');
        console.log('✅ Socket.IO server stopped');

        // Close MongoDB connection if it exists
        try {
          if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
            console.log('✅ MongoDB connection closed');
          }
          process.exit(0);
        } catch (err) {
          console.error('❌ Error closing MongoDB connection:', err.message);
          process.exit(1);
        }
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.error('⚠️  Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    // Handle process termination signals
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Handle unhandled promise rejections (but don't crash server for MongoDB issues)
    process.on('unhandledRejection', (err) => {
      console.error(`Unhandled Rejection: ${err.message}`);
      // Don't exit server for any errors - keep it running for demo purposes
    });

    // Try to connect to MongoDB in the background
    connectWithRetry().catch(error => {
      console.warn('⚠️ MongoDB connection failed - check .env and network settings');
      console.warn('⚠️ Authentication routes require database connection');
    });

    return server;

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer().catch(error => {
  console.error('Fatal error during server startup:', error);
  // Don't exit for MongoDB-related errors, only for critical server startup failures
  if (!error.message.includes('MongoDB') && !error.message.includes('mongoose') && !error.message.includes('ETIMEOUT')) {
    console.error('Critical server startup error, exiting');
    process.exit(1);
  } else {
    console.warn('Server startup completed with MongoDB issues, but HTTP server is still running');
  }
});