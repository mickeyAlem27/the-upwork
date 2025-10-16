import React, { useState, useEffect, useContext, useMemo } from 'react';
import { FiSend, FiBell, FiBellOff } from 'react-icons/fi';
import SocketContext from '../context/SocketContext';
import NotificationCenter from './NotificationCenter';
import api from '../services/api';

const Messages = () => {
  const { socket, isConnected, isUserOnline } = useContext(SocketContext);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [globalNotifications, setGlobalNotifications] = useState([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [unreadCounts, setUnreadCounts] = useState(new Map());
  const [missedMessages, setMissedMessages] = useState(new Map()); // userId -> messages array
  const [showUserProfile, setShowUserProfile] = useState(false);

  // Load unread counts from localStorage as fallback
  const loadUnreadCountsFromStorage = () => {
    try {
      const stored = localStorage.getItem(`unreadCounts_${currentUser?._id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Map(Object.entries(parsed));
      }
    } catch (error) {
      console.error('Error loading unread counts from storage:', error);
    }
    return new Map();
  };

  // Save unread counts to localStorage
  const saveUnreadCountsToStorage = (counts) => {
    try {
      if (currentUser?._id) {
        const obj = Object.fromEntries(counts);
        localStorage.setItem(`unreadCounts_${currentUser._id}`, JSON.stringify(obj));
      }
    } catch (error) {
      console.error('Error saving unread counts to storage:', error);
    }
  };

  // Load current user data and users
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      setError('');

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          window.location.href = '/login';
          return;
        }

        // Load current user and users data in parallel
        const [userResponse, usersResponse] = await Promise.all([
          api.get('/auth/me'),
          api.get('/users')
        ]);

        // Handle user data
        if (userResponse.data.success) {
          const userData = userResponse.data.data || userResponse.data.user || userResponse.data;
          if (userData) {
            const normalizedUserData = {
              _id: userData._id || userData.id,
              firstName: userData.firstName || userData.name?.split(' ')[0] || 'Unknown',
              lastName: userData.lastName || userData.name?.split(' ').slice(1).join(' ') || 'User',
              role: userData.role || 'user',
              photo: userData.photo || userData.avatar,
              ...userData
            };
            setCurrentUser(normalizedUserData);
            console.log('Current user loaded:', normalizedUserData);

            // Load localStorage unread counts FIRST (before API call)
            const localCounts = loadUnreadCountsFromStorage();
            console.log('📦 Loaded unread counts from localStorage:', Object.fromEntries(localCounts));
            setUnreadCounts(localCounts);

            // Then try to load from API (but don't overwrite localStorage data)
            try {
              const unreadResponse = await api.get(`/messages/unread-counts/${normalizedUserData._id}`);
              if (unreadResponse.data.success && unreadResponse.data.data) {
                const apiUnreadMap = new Map(Object.entries(unreadResponse.data.data));
                console.log('📡 API unread counts:', Object.fromEntries(apiUnreadMap));

                // Merge API data with localStorage data (localStorage takes precedence for existing keys)
                setUnreadCounts(prev => {
                  const merged = new Map(prev); // Start with localStorage data
                  // Only add API data for conversations not in localStorage
                  for (const [convId, count] of apiUnreadMap) {
                    if (!merged.has(convId)) {
                      merged.set(convId, count);
                    }
                  }
                  saveUnreadCountsToStorage(merged); // Save merged data
                  console.log('✅ Merged unread counts:', Object.fromEntries(merged));
                  return merged;
                });
              }
            } catch (error) {
              console.warn('Error loading unread counts from API:', error.message);
              // Keep localStorage data if API fails
              console.log('📦 Using localStorage unread counts due to API error');
            }
          }
        } else {
          console.error('Invalid user response:', userResponse.data);
          localStorage.removeItem('token');
          window.location.href = '/login';
          return;
        }

        // Handle users data (server returns array directly)
        if (Array.isArray(usersResponse.data)) {
          setUsers(usersResponse.data);
        } else if (usersResponse.data?.users && Array.isArray(usersResponse.data.users)) {
          setUsers(usersResponse.data.users);
        } else {
          console.warn('Unexpected users data format:', usersResponse.data);
          setUsers([]);
        }

      } catch (error) {
        console.error('Error loading initial data:', error);
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        } else if (error.response?.status === 503) {
          // Database unavailable - show error but don't logout
          setError('Database is temporarily unavailable. Please try again later.');
        } else {
          setError('Failed to load application data');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Request notification permissions
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        setNotificationsEnabled(permission === 'granted');
        if (permission === 'granted') {
          showNotificationToast('Browser notifications enabled!', 'success');
        } else {
          showNotificationToast('Browser notifications denied', 'error');
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        showNotificationToast('Failed to enable notifications', 'error');
      }
    } else if ('Notification' in window && Notification.permission === 'granted') {
      showNotificationToast('Notifications already enabled', 'info');
    } else {
      showNotificationToast('Browser notifications not supported', 'error');
    }
  };

  // Listen for user status updates with error handling
  useEffect(() => {
    if (!socket) return;

    const handleUserStatusUpdate = (data) => {
      try {
        if (data.userId && data.online !== undefined) {
          setUsers(prevUsers =>
            prevUsers.map(user =>
              user._id === data.userId
                ? { ...user, online: data.online }
                : user
            )
          );
        }
      } catch (error) {
        console.error('Error updating user status:', error);
      }
    };

    socket.on('user_status_update', handleUserStatusUpdate);

    return () => {
      if (socket) {
        socket.off('user_status_update', handleUserStatusUpdate);
      }
    };
  }, [socket, currentUser]);

  // Filter users based on search term and real-time online status (memoized for performance)
  // Exclude current user from the list since users can't message themselves
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) {
      return users.filter(user => user._id !== currentUser?._id);
    }
    const searchLower = searchTerm.toLowerCase();
    return users.filter(user =>
      user._id !== currentUser?._id &&
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchLower)
    );
  }, [users, searchTerm, currentUser]);

  // Separate online and offline users based on real-time status
  const onlineUsers = useMemo(() =>
    filteredUsers.filter(user => isUserOnline(user._id) && user._id !== currentUser?._id),
    [filteredUsers, isUserOnline, currentUser]
  );

  const offlineUsers = useMemo(() =>
    filteredUsers.filter(user => !isUserOnline(user._id) && user._id !== currentUser?._id),
    [filteredUsers, isUserOnline, currentUser]
  );

  // Retrieve missed messages for a specific user
  const retrieveMissedMessages = async (userId) => {
    try {
      // Only retrieve missed messages for the current logged-in user
      if (userId !== currentUser._id) {
        console.log('📬 Ignoring missed messages for other user:', userId);
        return [];
      }

      console.log('📬 Retrieving missed messages for user:', userId);
      const response = await api.get(`/missed-messages/${userId}`);

      if (response.data.success && response.data.messages) {
        const messages = response.data.messages;
        console.log(`📨 Retrieved ${messages.length} missed messages for user ${userId}`);

        // Store missed messages
        setMissedMessages(prev => {
          const newMissed = new Map(prev);
          newMissed.set(userId, messages);
          return newMissed;
        });

        return messages;
      }
    } catch (error) {
      console.error('Error retrieving missed messages:', error);
      showNotificationToast('Failed to retrieve missed messages', 'error');
    }
    return [];
  };

  // Mark missed messages as read
  const markMissedMessagesAsRead = async (userId) => {
    try {
      // Only mark messages as read for the current logged-in user
      if (userId !== currentUser._id) {
        console.log('✅ Ignoring mark as read for other user:', userId);
        return;
      }

      console.log('✅ Marking missed messages as read for user:', userId);
      const response = await api.post(`/mark-missed-messages-read/${userId}`);

      if (response.data.success) {
        // Clear missed messages from state
        setMissedMessages(prev => {
          const newMissed = new Map(prev);
          newMissed.delete(userId);
          return newMissed;
        });

        // Clear unread count for this user
        const conversationId = [currentUser._id, userId].sort().join('_');
        setUnreadCounts(prev => {
          const newCounts = new Map(prev);
          newCounts.delete(conversationId);
          saveUnreadCountsToStorage(newCounts);
          return newCounts;
        });

        console.log('✅ Missed messages marked as read');
        showNotificationToast('Missed messages marked as read', 'success');
      }
    } catch (error) {
      console.error('Error marking missed messages as read:', error);
      showNotificationToast('Failed to mark messages as read', 'error');
    }
  };

  // Handle conversation selection
  const handleUserSelect = async (user) => {
    if (isLoading) {
      showNotificationToast('User data not loaded yet', 'error');
      return;
    }

    console.log('🔄 Selecting user:', user.firstName, user.lastName, 'ID:', user._id);
    console.log('👤 Current user:', currentUser.firstName, currentUser.lastName, 'ID:', currentUser._id);

    setSelectedUser(user);
    setError('');
    setMessages([]);
    setShowUserProfile(true);

    try {
      const conversationId = [currentUser._id, user._id].sort().join('_');
      console.log('🔗 Conversation ID:', conversationId);

      // Clear unread count for this conversation when user selects it
      setUnreadCounts(prev => {
        const newCounts = new Map(prev);
        newCounts.delete(conversationId);
        saveUnreadCountsToStorage(newCounts); // Update localStorage
        return newCounts;
      });

      // Join conversation room with proper error handling
      if (socket && isConnected && socket.connected) {
        socket.emit('join_conversation', conversationId);
        // Request to load conversation messages
        socket.emit('load_conversation_messages', { conversationId });
        console.log('📡 Joined conversation and requested messages for:', conversationId);
      }
    } catch (error) {
      console.error('Error in handleUserSelect:', error);
      showNotificationToast('Error selecting user', 'error');
    }
  };

  // Handle clicking on user with unread messages
  const handleUserWithUnreadClick = async (user) => {
    // Only process if this is for the current logged-in user
    if (user._id === currentUser._id) {
      console.log('📬 Ignoring click on self (current user)');
      return;
    }

    const conversationId = [currentUser._id, user._id].sort().join('_');
    const unreadCount = unreadCounts.get(conversationId) || 0;

    if (unreadCount > 0) {
      // Show missed messages if any exist
      const userMissedMessages = missedMessages.get(user._id);
      if (userMissedMessages && userMissedMessages.length > 0) {
        console.log(`📬 Showing ${userMissedMessages.length} missed messages from ${user.firstName} ${user.lastName}`);

        // Show notification with missed messages
        const latestMessage = userMissedMessages[userMissedMessages.length - 1];
        showNotificationToast(
          `💬 ${userMissedMessages.length} missed message${userMissedMessages.length > 1 ? 's' : ''} from ${user.firstName}: "${latestMessage.content.substring(0, 50)}${latestMessage.content.length > 50 ? '...' : ''}"`,
          'info'
        );

        // Mark as read after showing
        setTimeout(() => {
          markMissedMessagesAsRead(user._id);
        }, 3000);
      } else {
        // Retrieve missed messages if not already cached
        await retrieveMissedMessages(user._id);
      }
    }

    // Then select the user normally
    handleUserSelect(user);
  };

  // Handle closing user profile
  const handleCloseProfile = () => {
    setShowUserProfile(false);
  };

  // Handle back to user list (mobile)
  const handleBackToUsers = () => {
    setSelectedUser(null);
    setShowUserProfile(false);
    setMessages([]);
  };

  // Global Socket.IO message handling (works for all received messages)
  useEffect(() => {
    if (!socket || !currentUser) return;

    const handleNewMessage = (message) => {
      try {
        console.log('📨 Received message:', message);
        console.log('🔍 Current selectedUser:', selectedUser ? selectedUser.firstName : 'NONE');
        console.log('👤 Current user:', currentUser ? currentUser.firstName : 'NONE');

        // Only process messages involving the current logged-in user
        if (!message.senderId || !message.recipientId || !currentUser._id) {
          console.log('📨 Ignoring message - missing user data');
          return;
        }

        // Only process if current user is sender OR recipient
        const isCurrentUserSender = message.senderId === currentUser._id;
        const isCurrentUserRecipient = message.recipientId === currentUser._id;

        if (!isCurrentUserSender && !isCurrentUserRecipient) {
          console.log('📨 Ignoring message - not for current user');
          return;
        }

        // Only show notifications for messages NOT in the current conversation view
        // This prevents duplicate notifications when viewing the conversation
        const isInCurrentConversation = selectedUser &&
          message.conversationId === [currentUser._id, selectedUser._id].sort().join('_');

        if (!isInCurrentConversation && isCurrentUserRecipient) {
          const senderName = message.sender?.firstName && message.sender?.lastName
            ? `${message.sender.firstName} ${message.sender.lastName}`
            : 'Someone';

          console.log('🔔 Showing notification for message from:', senderName);
          showNotificationToast(`💬 ${senderName}: ${message.content?.substring(0, 80)}${message.content?.length > 80 ? '...' : ''}`, 'info');
        }

        // Update unread counts for this conversation
        if (isCurrentUserRecipient) {
          // Current user is RECEIVER - increment unread count
          const currentConversationId = message.conversationId || [message.senderId, message.recipientId].sort().join('_');
          setUnreadCounts(prev => {
            const newCounts = new Map(prev);
            const currentCount = newCounts.get(currentConversationId) || 0;
            newCounts.set(currentConversationId, currentCount + 1);
            saveUnreadCountsToStorage(newCounts);
            console.log(`📬 Incremented unread count for conversation ${currentConversationId}: ${currentCount + 1}`);
            return newCounts;
          });
        } else if (isCurrentUserSender) {
          // Current user is SENDER - clear unread count for this conversation
          const currentConversationId = message.conversationId || [message.senderId, message.recipientId].sort().join('_');
          setUnreadCounts(prev => {
            const newCounts = new Map(prev);
            newCounts.delete(currentConversationId); // Clear unread count since user just sent message
            saveUnreadCountsToStorage(newCounts);
            console.log(`✅ Cleared unread count for conversation ${currentConversationId} (sender)`);
            return newCounts;
          });
        }
      } catch (error) {
        console.error('Error handling new message:', error);
      }
    };

    socket.on('new_message', handleNewMessage);

    // Listen for real-time missed message count updates (for offline users)
    const handleMissedMessageCountUpdate = (data) => {
      try {
        // Only process updates for the current logged-in user
        if (data.userId && data.userId === currentUser._id && data.missedMessageCount !== undefined) {
          console.log('📬 GLOBAL: Received missed message count update for CURRENT USER:', data.userId, 'count:', data.missedMessageCount);

          // Update unread count for the specific user
          const conversationId = [currentUser._id, data.userId].sort().join('_');
          setUnreadCounts(prev => {
            const newCounts = new Map(prev);
            if (data.missedMessageCount > 0) {
              newCounts.set(conversationId, data.missedMessageCount);
            } else {
              newCounts.delete(conversationId);
            }
            saveUnreadCountsToStorage(newCounts);
            return newCounts;
          });
        } else if (data.userId && data.userId !== currentUser._id) {
          console.log('📬 GLOBAL: Ignoring missed message update for OTHER user:', data.userId);
        }
      } catch (error) {
        console.error('Error updating missed message count:', error);
      }
    };

    socket.on('missed_message_count_updated', handleMissedMessageCountUpdate);

    // Listen for direct message notifications (for receivers)
    const handleMessageNotification = (data) => {
      try {
        console.log('📨 Received message notification:', data);

        // Only process notifications for the current logged-in user
        if (data.type === 'new_message' && data.senderId !== currentUser._id) {
          // Additional check: ensure this notification is meant for current user
          // The server should only send notifications to the recipient, but double-check
          const senderName = data.senderName || 'Someone';
          console.log('🔔 Showing notification for message from:', senderName, 'to user:', currentUser.firstName);

          showNotificationToast(`💬 ${senderName}: ${data.messageContent?.substring(0, 80)}${data.messageContent?.length > 80 ? '...' : ''}`, 'info');
        } else if (data.senderId === currentUser._id) {
          console.log('📨 Ignoring notification for own message (sender)');
        }
      } catch (error) {
        console.error('Error handling message notification:', error);
      }
    };

    socket.on('new_message_notification', handleMessageNotification);

    return () => {
      if (socket) {
        socket.off('new_message', handleNewMessage);
        socket.off('missed_message_count_updated', handleMissedMessageCountUpdate);
        socket.off('new_message_notification', handleMessageNotification);
      }
    };
  }, [socket, currentUser]);

  // Conversation-specific Socket.IO handling (only when viewing a conversation)
  useEffect(() => {
    if (!selectedUser || !currentUser || !socket) return;

    const conversationId = [currentUser._id, selectedUser._id].sort().join('_');

    const joinConversation = () => {
      if (socket && socket.connected) {
        socket.emit('join_conversation', conversationId);
      }
    };

    joinConversation();

    const handleNewMessage = (message) => {
      try {
        // Add message to current conversation if it's the one being viewed
        if (message.conversationId === conversationId) {
          console.log('💬 Adding message to current conversation view');
          setMessages(prev => [...prev, message]);
        }
      } catch (error) {
        console.error('Error handling conversation message:', error);
      }
    };

    const handleLoadMessages = (data) => {
      try {
        console.log('📨 Loading messages for conversation:', data.conversationId, 'Message count:', data.messages?.length);

        if (data.conversationId === conversationId && data.messages && Array.isArray(data.messages)) {
          console.log('✅ Setting messages for conversation:', conversationId);
          setMessages(data.messages);

          // If messages were loaded and conversation was selected, mark as read
          if (data.messages.length > 0) {
            setUnreadCounts(prev => {
              const newCounts = new Map(prev);
              newCounts.delete(conversationId);
              saveUnreadCountsToStorage(newCounts); // Also save to localStorage
              console.log(`✅ Cleared unread count for conversation ${conversationId} (messages loaded)`);
              return newCounts;
            });
          }
        } else {
          console.log('❌ Message load failed - wrong conversation or invalid data');
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('load_messages', handleLoadMessages);

    return () => {
      try {
        if (socket && socket.connected) {
          socket.emit('leave_conversation', conversationId);
        }
        socket.off('new_message', handleNewMessage);
        socket.off('load_messages', handleLoadMessages);
      } catch (error) {
        console.error('Error cleaning up socket listeners:', error);
      }
    };
  }, [selectedUser, currentUser, socket]);

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!messageInput.trim() || !selectedUser || !socket || !isConnected) {
      return;
    }

    // Ensure current user is loaded before sending message
    if (isLoading) {
      showNotificationToast('User data not loaded yet', 'error');
      return;
    }

    const conversationId = [currentUser._id, selectedUser._id].sort().join('_');
    const messageData = {
      conversationId,
      content: messageInput.trim(),
      recipientId: selectedUser._id,
      senderId: currentUser._id,
      timestamp: new Date()
    };

    setIsSending(true);

    try {
      socket.emit('send_message', messageData);

      showNotificationToast('Message sent successfully!', 'success');
      setMessageInput('');

    } catch (error) {
      console.error('Error sending message:', error);
      showNotificationToast('Failed to send message', 'error');
    } finally {
      setTimeout(() => setIsSending(false), 500);
    }
  };

  // Notification system - both local and global
  const showNotificationToast = (message, type = 'info') => {
    let title = 'Notification';
    switch (type) {
      case 'success':
        title = 'Success';
        break;
      case 'error':
        title = 'Error';
        break;
      case 'info':
      default:
        title = 'New Message';
        break;
    }

    const notification = {
      id: Date.now(),
      title,
      message,
      type,
      timestamp: new Date(),
      read: false
    };

    // Add to global notifications (for NotificationCenter)
    setGlobalNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep only latest 10

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setGlobalNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  // Browser notification function
  const showBrowserNotification = (title, body, icon) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon });
    }
  };

  // Get avatar URL with proper photo handling
  const getAvatarUrl = (user, size = 40) => {
    if (!user) return '';

    // Handle current user with proper fallbacks
    if (user._id === currentUser?._id) {
      // Use actual user photo if available, fallback to avatar generator
      if (user.photo) {
        return `http://localhost:5000${user.photo}`;
      }
    } else {
      // For other users, use actual photo if available
      if (user.photo) {
        return `http://localhost:5000${user.photo}`;
      }
    }

    // Generate avatar from name if no photo available
    const firstName = user.firstName || currentUser?.firstName || 'Unknown';
    const lastName = user.lastName || currentUser?.lastName || 'User';
    const encodedName = encodeURIComponent(`${firstName} ${lastName}`);
    if (size) {
      return `https://ui-avatars.com/api/?name=${encodedName}&background=1f2937&color=fff&size=${size}`;
    }
    return `https://ui-avatars.com/api/?name=${encodedName}&background=1f2937&color=fff`;
  };

  // Get proper role display name
  const getRoleDisplayName = (role) => {
    if (!role) return 'User';

    const roleMap = {
      'admin': 'Administrator',
      'moderator': 'Moderator',
      'premium': 'Premium User',
      'user': 'User',
      'member': 'Member',
      'guest': 'Guest'
    };

    return roleMap[role.toLowerCase()] || role.charAt(0).toUpperCase() + role.slice(1);
  };

  // Render error state
  if (error) {
    return (
      <div className="flex h-screen bg-gray-900 text-white items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-medium mb-2 text-red-400">Error Loading Messages</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-900 text-white items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white relative">
      {/* Global Notifications - Fixed position overlay (visible even when no user selected) */}
      {globalNotifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm pointer-events-auto">
          {globalNotifications.slice(0, 3).map((notification) => ( // Show max 3 notifications
            <div
              key={notification.id}
              className={`px-4 py-3 rounded-lg shadow-xl border-2 transition-all duration-300 transform animate-in slide-in-from-top-2 fade-in-0 ${
                notification.type === 'success'
                  ? 'bg-green-600/95 text-white border-green-400 shadow-green-500/50'
                  : notification.type === 'error'
                  ? 'bg-red-600/95 text-white border-red-400 shadow-red-500/50'
                  : 'bg-blue-600/95 text-white border-blue-400 shadow-blue-500/50'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{notification.title}</p>
                  <p className="text-sm opacity-95 mt-1 break-words leading-relaxed">{notification.message}</p>
                </div>
                <button
                  onClick={() => setGlobalNotifications(prev => prev.filter(n => n.id !== notification.id))}
                  className="text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                  title="Dismiss notification"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Left sidebar - User list */}
      <div className={`${selectedUser && showUserProfile ? 'hidden md:block md:w-1/3' : 'w-full md:w-1/3'} border-r border-gray-700 flex flex-col h-full`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Messages</h1>
            <div className="flex items-center space-x-2">
              <NotificationCenter
                notifications={globalNotifications}
                onMarkAsRead={(id) => {
                  setGlobalNotifications(prev =>
                    prev.map(n => n.id === id ? { ...n, read: true } : n)
                  );
                }}
                onMarkAllAsRead={() => {
                  setGlobalNotifications(prev =>
                    prev.map(n => ({ ...n, read: true }))
                  );
                }}
                onRemoveNotification={(id) => {
                  setGlobalNotifications(prev => prev.filter(n => n.id !== id));
                }}
              />
              <button
                onClick={() => {
                  // Show current unread count summary
                  let totalUnread = 0;
                  let unreadConversations = 0;
                  users.forEach(user => {
                    if (user._id !== currentUser._id) {
                      const conversationId = [currentUser._id, user._id].sort().join('_');
                      const unreadCount = unreadCounts.get(conversationId) || 0;
                      if (unreadCount > 0) {
                        totalUnread += unreadCount;
                        unreadConversations++;
                      }
                    }
                  });

                  if (totalUnread > 0) {
                    showNotificationToast(
                      `You have ${totalUnread} unread messages in ${unreadConversations} conversation${unreadConversations > 1 ? 's' : ''}`,
                      'info'
                    );
                  } else {
                    showNotificationToast('No unread messages', 'info');
                  }
                }}
                className={`p-2 rounded-full transition-colors ${
                  (() => {
                    let totalUnread = 0;
                    users.forEach(user => {
                      if (user._id !== currentUser._id) {
                        const conversationId = [currentUser._id, user._id].sort().join('_');
                        const unreadCount = unreadCounts.get(conversationId) || 0;
                        totalUnread += unreadCount;
                      }
                    });
                    return totalUnread > 0 ? 'text-red-400 hover:text-red-300' : 'text-gray-400 hover:text-gray-500';
                  })()
                }`}
                title="View unread message summary"
              >
                {(() => {
                  let totalUnread = 0;
                  users.forEach(user => {
                    if (user._id !== currentUser._id) {
                      const conversationId = [currentUser._id, user._id].sort().join('_');
                      const unreadCount = unreadCounts.get(conversationId) || 0;
                      totalUnread += unreadCount;
                    }
                  });
                  return totalUnread > 0 ? <FiBell className="animate-pulse" size={20} /> : <FiBellOff size={20} />;
                })()}
              </button>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className={`text-xs ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                {isConnected ? 'Live' : 'Offline'}
              </span>
              {!currentUser && (
                <span className="text-xs text-yellow-400 animate-pulse">
                  Loading...
                </span>
              )}
            </div>
          </div>

          {/* Current User Profile - Enhanced with better data handling */}
          {currentUser && (currentUser._id || currentUser.firstName) && (
            <div className="mt-4 flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg">
              <div className="relative">
                <img
                  src={getAvatarUrl(currentUser, 48)}
                  alt={`${currentUser.firstName || 'Unknown'} ${currentUser.lastName || 'User'}`}
                  className="w-12 h-12 rounded-full object-cover border-2 border-blue-500"
                  onError={(e) => {
                    // Fallback to generated avatar if photo fails
                    const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(`${currentUser.firstName || 'Unknown'} ${currentUser.lastName || 'User'}`)}&background=1f2937&color=fff&size=48`;
                    e.target.src = fallbackUrl;
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <p className="font-medium text-white truncate">
                    {currentUser.firstName || 'Unknown'} {currentUser.lastName || 'User'} (You)
                  </p>
                  {/* Current user notification count */}
                  {(() => {
                    let totalUnread = 0;
                    users.forEach(user => {
                      if (user._id !== currentUser._id) {
                        const conversationId = [currentUser._id, user._id].sort().join('_');
                        const unreadCount = unreadCounts.get(conversationId) || 0;
                        totalUnread += unreadCount;
                      }
                    });
                    // console.log(`Current user total unread count: ${totalUnread}`);
                    return totalUnread > 0 ? (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center font-medium">
                        {totalUnread > 99 ? '99+' : totalUnread}
                      </span>
                    ) : null;
                  })()}
                </div>
                <p className="text-sm text-gray-300 truncate">
                  {getRoleDisplayName(currentUser.role) || 'User'}
                </p>
              </div>
            </div>
          )}

          {/* Loading state for current user */}
          {isLoading && !currentUser && (
            <div className="mt-4 flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg animate-pulse">
              <div className="w-12 h-12 rounded-full bg-gray-700 border-2 border-gray-600"></div>
              <div className="flex-1 min-w-0">
                <div className="h-4 bg-gray-700 rounded mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-2/3"></div>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="mt-4 relative">
            <input
              type="text"
              placeholder="Search users..."
              className="w-full bg-gray-700/50 text-white pl-3 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto relative">
          {(() => {
            return (
              <>
                {/* Loading overlay for user list */}
                {isLoading && (
                  <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center z-10">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-300">Loading user data...</p>
                    </div>
                  </div>
                )}

                {/* Online Users */}
                {onlineUsers.length > 0 && (
                  <div className="p-3">
                    <div className="text-xs font-semibold text-green-400 mb-2 flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                      Online ({onlineUsers.length})
                    </div>
                    <div className="space-y-1">
                      {onlineUsers.map((user) => (
                        <div
                          key={user._id}
                          className={`p-3 hover:bg-gray-800/50 cursor-pointer flex items-center space-x-3 transition-colors ${selectedUser?._id === user._id ? 'bg-gray-800/70' : ''} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onClick={() => {
                            const conversationId = [currentUser?._id, user._id].sort().join('_');
                            const unreadCount = unreadCounts.get(conversationId) || 0;
                            return isLoading ? null : (unreadCount > 0 ? handleUserWithUnreadClick(user) : handleUserSelect(user));
                          }}
                          title={(() => {
                            const conversationId = [currentUser?._id, user._id].sort().join('_');
                            const unreadCount = unreadCounts.get(conversationId) || 0;
                            return isLoading ? 'Loading user data...' : (unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''} - Click to view` : `Chat with ${user.firstName} ${user.lastName}`);
                          })()}
                        >
                          <div className="relative">
                            <img
                              src={getAvatarUrl(user)}
                              alt={`${user.firstName} ${user.lastName}`}
                              className="w-10 h-10 rounded-full object-cover border-2 border-gray-700"
                              onError={(e) => {
                                e.target.src = getAvatarUrl(user);
                              }}
                            />
                            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 bg-green-500 animate-pulse shadow-green-500/50 shadow-lg`}></span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="font-medium text-white truncate text-sm">
                                {user.firstName} {user.lastName}
                              </p>
                              <span className={`text-xs px-2 py-1 rounded-full font-semibold bg-green-500/30 text-green-300 border border-green-400/50 animate-pulse`}>
                                🟢 Online
                              </span>
                              {(() => {
                                const conversationId = [currentUser?._id, user._id].sort().join('_');
                                const unreadCount = unreadCounts.get(conversationId) || 0;
                                // console.log(`User ${user.firstName} ${user.lastName} - Conversation: ${conversationId}, Unread: ${unreadCount}`);
                                return unreadCount > 0 ? (
                                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center font-medium">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                  </span>
                                ) : null;
                              })()}
                            </div>
                            <p className="text-xs text-gray-300 truncate">{getRoleDisplayName(user.role)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Offline Users */}
                {offlineUsers.length > 0 && (
                  <div className="p-3">
                    <div className="text-xs font-semibold text-gray-400 mb-2 flex items-center">
                      <span className="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
                      Offline ({offlineUsers.length})
                    </div>
                    <div className="space-y-1">
                      {offlineUsers.map((user) => (
                        <div
                          key={user._id}
                          className={`p-3 hover:bg-gray-800/50 cursor-pointer flex items-center space-x-3 transition-colors ${selectedUser?._id === user._id ? 'bg-gray-800/70' : ''} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onClick={() => {
                            const conversationId = [currentUser?._id, user._id].sort().join('_');
                            const unreadCount = unreadCounts.get(conversationId) || 0;
                            return isLoading ? null : (unreadCount > 0 ? handleUserWithUnreadClick(user) : handleUserSelect(user));
                          }}
                          title={(() => {
                            const conversationId = [currentUser?._id, user._id].sort().join('_');
                            const unreadCount = unreadCounts.get(conversationId) || 0;
                            return isLoading ? 'Loading user data...' : (unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''} - Click to view` : `Chat with ${user.firstName} ${user.lastName}`);
                          })()}
                        >
                          <div className="relative">
                            <img
                              src={getAvatarUrl(user)}
                              alt={`${user.firstName} ${user.lastName}`}
                              className="w-10 h-10 rounded-full object-cover border-2 border-gray-700"
                              onError={(e) => {
                                e.target.src = getAvatarUrl(user);
                              }}
                            />
                            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 bg-gray-500`}></span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="font-medium text-white truncate text-sm">
                                {user.firstName} {user.lastName}
                              </p>
                              <span className={`text-xs px-2 py-1 rounded-full font-semibold bg-gray-500/30 text-gray-400`}>
                                ⚫ Offline
                              </span>
                              {(() => {
                                const conversationId = [currentUser?._id, user._id].sort().join('_');
                                const unreadCount = unreadCounts.get(conversationId) || 0;
                                // console.log(`User ${user.firstName} ${user.lastName} - Conversation: ${conversationId}, Unread: ${unreadCount}`);
                                return unreadCount > 0 ? (
                                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center font-medium">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                  </span>
                                ) : null;
                              })()}
                            </div>
                            <p className="text-xs text-gray-300 truncate">{getRoleDisplayName(user.role)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No users message */}
                {onlineUsers.length === 0 && offlineUsers.length === 0 && (
                  <div className="p-6 text-center text-gray-400">
                    <div className="text-4xl mb-2">🔍</div>
                    <p className="text-lg font-medium mb-1">
                      {users.length === 0 ? 'No users available' : 'No users match your search'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {users.length === 0 ? 'Check back later for new users' : 'Try adjusting your search terms'}
                    </p>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Middle section - Chat area or Default content */}
      <div className={`${selectedUser && showUserProfile ? 'block md:flex-1' : 'hidden md:block md:flex-1'} bg-gray-800/30 flex-col h-full`}>
        {selectedUser && showUserProfile ? (
          <>
            {/* Chat Header - Fixed */}
            <div className="flex-shrink-0 p-4 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                <img
                  src={getAvatarUrl(selectedUser)}
                  alt={`${selectedUser.firstName} ${selectedUser.lastName}`}
                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-700"
                />
                <div className="flex-1 min-w-0">
                  <h2 className="font-medium truncate">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </h2>
                  <p className="text-xs text-gray-400">{getRoleDisplayName(selectedUser.role)}</p>
                </div>
              </div>
            </div>

            {/* Messages Area - Scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0 relative">
              <div className="p-4">
                {messages.length > 0 ? (
                  <div className="space-y-4">
                    {messages.map((msg, index) => {
                      // Determine if message is from current user or other user
                      const isFromCurrentUser = msg.senderId === currentUser?._id;
                      const sender = users.find(user => user._id === msg.senderId);

                      console.log(`📨 Message ${index}:`, {
                        isFromCurrentUser,
                        senderId: msg.senderId,
                        currentUserId: currentUser?._id,
                        selectedUserId: selectedUser?._id,
                        sender: sender ? `${sender.firstName} ${sender.lastName}` : 'Unknown'
                      });

                      return (
                        <div
                          key={index}
                          className={`flex ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className="flex items-end space-x-2 max-w-xs">
                            {!isFromCurrentUser && (
                              <img
                                src={getAvatarUrl(sender)}
                                alt={sender ? `${sender.firstName} ${sender.lastName}` : 'User'}
                                className="w-6 h-6 rounded-full object-cover border border-gray-600"
                                onError={(e) => {
                                  e.target.src = getAvatarUrl(sender);
                                }}
                              />
                            )}
                            <div
                              className={`p-3 rounded-lg ${isFromCurrentUser ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'}`}
                            >
                              {!isFromCurrentUser && (
                                <p className="text-xs text-gray-300 mb-1">
                                  {sender ? `${sender.firstName} ${sender.lastName}` : 'Unknown User'}
                                </p>
                              )}
                              <p className="text-sm break-words">{msg.content}</p>
                              <p className={`text-xs mt-1 opacity-70 ${isFromCurrentUser ? 'text-blue-200' : 'text-gray-300'}`}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            {isFromCurrentUser && (
                              <img
                                src={getAvatarUrl(currentUser)}
                                alt={`${currentUser?.firstName} ${currentUser?.lastName}`}
                                className="w-6 h-6 rounded-full object-cover border-2 border-blue-500"
                                onError={(e) => {
                                  e.target.src = getAvatarUrl(currentUser);
                                }}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center">
                    <div className="text-4xl mb-4">💬</div>
                    <h3 className="text-lg font-medium mb-1">Start a conversation</h3>
                    <p className="text-sm">Send a message to begin chatting</p>
                  </div>
                )}
              </div>
            </div>

            {/* Message Input - Fixed at bottom */}
            <div className="flex-shrink-0 p-4 border-t border-gray-700 bg-gray-800/30">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder={`Message ${selectedUser?.firstName || 'user'}...`}
                  className="flex-1 bg-gray-700/50 text-white px-4 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  disabled={!isConnected || isSending || isLoading}
                />
                <button
                  type="submit"
                  className={`p-2 rounded-full transition-all duration-200 ${
                    messageInput.trim() && isConnected && !isSending && !isLoading
                      ? 'bg-green-500 text-white hover:bg-green-600 hover:scale-110'
                      : isSending
                      ? 'bg-yellow-500 text-white animate-pulse'
                      : isLoading
                      ? 'bg-gray-500 text-gray-300'
                      : 'bg-gray-600 text-gray-400'
                  }`}
                  disabled={!messageInput.trim() || !isConnected || isSending || isLoading}
                  title={
                    !isConnected
                      ? 'Socket.IO not connected'
                      : isSending
                      ? 'Sending message...'
                      : isLoading
                      ? 'Loading user data...'
                      : 'Send message'
                  }
                >
                  {isSending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <FiSend size={18} />
                  )}
                </button>
              </form>
              {isSending && (
                <div className="text-xs text-yellow-400 mt-1 text-center">
                  Sending message...
                </div>
              )}
            </div>
          </>
        ) : (
          /* Default state - Show welcome message when no user selected */
          <div className="flex flex-col h-full">
            <div className="flex flex-col items-center justify-center flex-1 text-gray-500 p-4 text-center">
              <div className="mb-6">
                <div className="w-full max-w-md mx-auto rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center h-48">
                  <div className="text-6xl animate-pulse">💬</div>
                </div>
              </div>
              <div className={`w-16 h-16 rounded-full mb-4 flex items-center justify-center ${isConnected ? 'bg-green-500/20 animate-pulse' : 'bg-red-500/20'}`}>
                <div className={`text-2xl ${isConnected ? 'text-green-400' : 'text-red-400'}`}>💬</div>
              </div>
              <h2 className="text-xl font-medium mb-2">
                {isConnected ? 'Messaging Active' : 'Connection Required'}
              </h2>
              <p className="text-gray-400 mb-4">
                {isConnected
                  ? 'Real-time messaging is working perfectly'
                  : 'Please check your internet connection and server status'
                }
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right section - User Profile (visible when user selected) */}
      {selectedUser && showUserProfile && (
        <div className="hidden md:block md:w-1/3 border-l border-gray-700 bg-gray-800/50">
          <div className="p-4 h-full flex flex-col">
            {/* Profile Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">User Profile</h2>
              <button
                onClick={handleCloseProfile}
                className="text-gray-400 hover:text-white transition-colors"
                title="Close profile"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* User Profile Content */}
            <div className="flex-1 flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="relative mb-6">
                <img
                  src={getAvatarUrl(selectedUser, 120)}
                  alt={`${selectedUser.firstName} ${selectedUser.lastName}`}
                  className="w-24 h-24 rounded-full object-cover border-4 border-gray-700"
                  onError={(e) => {
                    e.target.src = getAvatarUrl(selectedUser, 120);
                  }}
                />
                <span className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-gray-800 ${isUserOnline(selectedUser._id) ? 'bg-green-500 animate-pulse shadow-green-500/50 shadow-lg' : 'bg-gray-500'}`}></span>
              </div>

              {/* User Info */}
              <div className="space-y-4 w-full">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </h3>
                  <div className="flex items-center justify-center space-x-2">
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold transition-all duration-300 ${isUserOnline(selectedUser._id) ? 'bg-green-500/30 text-green-300 border border-green-400/50 animate-pulse' : 'bg-gray-500/30 text-gray-400'}`}>
                      {isUserOnline(selectedUser._id) ? '🟢 Online' : '⚫ Offline'}
                    </span>
                  </div>
                </div>

                {/* Role */}
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div>
                    <p className="text-sm text-gray-400 uppercase tracking-wide">Role</p>
                    <p className="text-white font-medium">{getRoleDisplayName(selectedUser.role)}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-4">
                  <button
                    onClick={() => window.open(`http://localhost:5173/profile/${selectedUser._id}`, '_blank')}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    See All Profile
                  </button>
                  <button
                    onClick={() => setShowUserProfile(false)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Back to Chat
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
