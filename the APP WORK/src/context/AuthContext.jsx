import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Check if user is logged in on initial load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('AuthContext: Checking auth, token exists:', !!token);
        if (token) {
          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Auth check timeout')), 5000)
          );

          const authPromise = authAPI.getMe();
          console.log('AuthContext: Calling getMe API...');

          const response = await Promise.race([authPromise, timeoutPromise]);
          console.log('AuthContext: getMe response:', response);
          if (response.data) {
            console.log('AuthContext: Setting user and authenticated to true');
            setUser(response.data);
            setIsAuthenticated(true);
          } else {
            console.log('AuthContext: No user data in response');
          }
        } else {
          console.log('AuthContext: No token found');
        }
      } catch (error) {
        console.error('AuthContext: Auth check error:', error);
        // Clear invalid token but don't block the app
        localStorage.removeItem('token');
        setError('Authentication check failed, but app will continue');
      } finally {
        console.log('AuthContext: Setting loading to false');
        setIsLoading(false);
      }
    };

    // Delay auth check slightly to let the app render first
    const timer = setTimeout(checkAuth, 100);
    return () => clearTimeout(timer);
  }, []);

  // Login function
  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    setError('');

    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Login timeout')), 10000)
      );

      const loginPromise = authAPI.login({ email, password });
      const response = await Promise.race([loginPromise, timeoutPromise]);

      console.log('Login response structure:', response);

      if (response.token) {
        localStorage.setItem('token', response.token);
        console.log('Token stored in localStorage');

        // Get user data with timeout
        try {
          const userTimeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('User data fetch timeout')), 5000)
          );

          const userPromise = authAPI.getMe();
          const userResponse = await Promise.race([userPromise, userTimeoutPromise]);

          setUser(userResponse.data);
          setIsAuthenticated(true);
          return { success: true };
        } catch (userError) {
          console.error('Error fetching user data after login:', userError);
          // Still consider login successful if we got a token
          setIsAuthenticated(true);
          return { success: true };
        }
      }
      return { success: false, message: 'Login failed - no token received' };
    } catch (error) {
      console.error('Login error:', error);
      const message = error.message || 'Login failed. Please check your credentials.';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  // Register function
  const register = useCallback(async (userData) => {
    setIsLoading(true);
    setError('');

    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Registration timeout')), 10000)
      );

      const registerPromise = authAPI.register(userData);
      const response = await Promise.race([registerPromise, timeoutPromise]);

      if (response.data.success) {
        // Return success without auto-login, let the component handle the navigation
        return { success: true };
      }
      return { success: false, message: response.data.message || 'Registration failed' };
    } catch (error) {
      console.error('Registration error:', error);
      const message = error.message || 'Registration failed. Please try again.';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update user function
  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token: localStorage.getItem('token'),
        isAuthenticated,
        isLoading,
        error,
        login,
        logout,
        register,
        setUser,
        updateUser,
      }}
    >
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;