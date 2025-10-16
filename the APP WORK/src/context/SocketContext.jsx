import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState(new Set());
  const socketRef = useRef(null);

  useEffect(() => {
    if (user && token) {
      console.log('🔌 Connecting to Socket.IO...');

      const newSocket = io('http://localhost:5000', {
        auth: { token: token }
      });

      socketRef.current = newSocket;

      newSocket.on('connect', () => {
        console.log('✅ Socket.IO Connected!');
        setIsConnected(true);
        setSocket(newSocket);

        // Send current user info to server for proper identification
        if (user && user._id) {
          newSocket.emit('user_identify', {
            userId: user._id,
            email: user.email
          });
        }
      });

      newSocket.on('disconnect', () => {
        console.log('❌ Socket.IO Disconnected');
        setIsConnected(false);
        // Don't clear connected users - let server handle user_offline events
      });

      // Track connected users
      newSocket.on('user_online', (data) => {
        console.log('👤 User online:', data.userId, data.isExisting ? '(existing)' : '(new)');
        setConnectedUsers(prev => new Set([...prev, data.userId]));
      });

      newSocket.on('user_offline', (data) => {
        console.log('👤 User offline:', data.userId);
        setConnectedUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      });

      return () => {
        newSocket.close();
      };
    }
  }, [user, token]);

  const value = {
    socket,
    isConnected,
    connectedUsers: Array.from(connectedUsers),
    isUserOnline: useCallback((userId) => connectedUsers.has(userId), [connectedUsers])
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;
