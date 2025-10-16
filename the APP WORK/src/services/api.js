import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true // Important for sending cookies
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle network errors (like connection refused)
    if (error.code === 'ERR_NETWORK') {
      console.error('Network Error:', error.message);
      throw new Error('Unable to connect to the server. Please check your internet connection and try again.');
    }

    const originalRequest = error.config;

    // Handle 503 Service Unavailable (Database not connected)
    if (error.response?.status === 503) {
      console.warn('Database unavailable');
      throw new Error('Database is temporarily unavailable. Please try again later.');
    }

    // Handle 404 Not Found (Route not found or server issues)
    if (error.response?.status === 404) {
      console.warn('API endpoint not found');
      throw new Error('API endpoint not found. Please check server configuration.');
    }

    // If error is not 401 or it's a retry, reject
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      // Try to refresh token
      const response = await axios.get(`${API_URL}/auth/refresh-token`, {
        withCredentials: true
      });

      const { token } = response.data;
      localStorage.setItem('token', token);

      // Retry the original request
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return api(originalRequest);
    } catch (error) {
      // If refresh fails, logout user
      localStorage.removeItem('token');
      // Don't redirect here, let the component handle it
      return Promise.reject(error);
    }
  }
);

// Auth API
export const authAPI = {
  // Register new user
  register: async (userData) => {
    try {
      console.log('Sending registration request:', userData);
      const response = await api.post('/auth/register', userData);
      console.log('Registration response:', response.data);
      // Store token in localStorage
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      return response.data;
    } catch (error) {
      console.error('Registration API error:', error);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
        throw error.response.data?.message || 
               error.response.data?.error || 
               `Registration failed with status ${error.response.status}`;
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        throw 'No response from server. Please check your connection.';
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Request setup error:', error.message);
        throw `Request error: ${error.message}`;
      }
    }
  },
  
  // Login user
  login: async (credentials) => {
    try {
      console.log('Attempting login with credentials:', { email: credentials.email });
      const response = await api.post('/auth/login', {
        email: credentials.email.trim(),
        password: credentials.password
      });
      
      console.log('Login response:', response.data);
      
      // Store token in localStorage if it exists
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        console.log('Token stored in localStorage');
      } else {
        console.warn('No token received in login response');
      }
      
      return response.data;
    } catch (error) {
      console.error('Login API error:', error);
      
      let errorMessage = 'Login failed. Please check your credentials and try again.';
      
      if (error.response) {
        // Server responded with an error status code
        console.error('Response data:', error.response.data);
        console.error('Status:', error.response.status);
        
        if (error.response.status === 401) {
          errorMessage = 'Invalid email or password. Please try again.';
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data?.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        // Something happened in setting up the request
        console.error('Request setup error:', error.message);
        errorMessage = `Request error: ${error.message}`;
      }
      
      throw new Error(errorMessage);
    }
  },
  
  // Get current user
  getMe: async () => {
    try {
      console.log('Fetching current user data...');
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.warn('No token found when trying to fetch user data');
        throw new Error('Not authenticated');
      }
      
      const response = await api.get('/auth/me');
      console.log('User data response:', response.data);
      
      // Handle different response formats
      const userData = response.data.data || response.data.user || response.data;
      console.log('User data extracted:', userData);
      return { data: userData };
    } catch (error) {
      console.error('Error fetching user data:', error);
      
      // Clear invalid token
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
      }
      
      throw new Error(error.response?.data?.message || 'Failed to fetch user data');
    }
  },
  
  // Update current user profile
  updateProfile: async (profileData) => {
    try {
      console.log('Updating user profile:', profileData);
      const response = await api.put('/auth/profile', profileData);
      console.log('Profile updated successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw new Error(error.response?.data?.message || 'Failed to update profile');
    }
  },
  
  // Logout user
  logout: async () => {
    try {
      await api.get('/auth/logout');
      localStorage.removeItem('token');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }
};

// Posts API
export const postsAPI = {
  // Create a post
  create: async ({ text, mediaUrl, mediaType }) => {
    const payload = { text: text?.trim() || '', mediaUrl: mediaUrl || '', mediaType: mediaType || '' };
    const res = await api.post('/posts', payload);
    return res.data;
  },

  // Get current user's posts
  getMyPosts: async () => {
    const res = await api.get('/posts/me');
    return res.data;
  },

  // Get posts for a specific user
  getUserPosts: async (userId) => {
    const res = await api.get(`/posts/user/${userId}`);
    return res.data;
  },

  // Get feed
  getFeed: async () => {
    const res = await api.get('/posts/feed');
    return res.data;
  },

  // Upload file
  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  }
};

// Jobs API
export const jobsAPI = {
  // Get all active jobs
  getJobs: async () => {
    const res = await api.get('/jobs');
    return res.data;
  },

  // Get my jobs (for promoters)
  getMyJobs: async () => {
    const res = await api.get('/jobs/me');
    return res.data;
  },

  // Create a new job
  createJob: async (jobData) => {
    const res = await api.post('/jobs', jobData);
    return res.data;
  },

  // Deactivate a job
  deactivateJob: async (jobId) => {
    const res = await api.patch(`/jobs/${jobId}/deactivate`);
    return res.data;
  }
};

// Export the base API instance for direct use
export default api;

