import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import assets from '../assets/assets.js';

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const { email, password } = formData;
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading, error: authError } = useAuth();

  // Debug useAuth
  console.log('useAuth:', { login, isAuthenticated, isLoading, authError });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // Get the redirect URL from query parameters or default to '/home'
      const searchParams = new URLSearchParams(window.location.search);
      const redirectTo = searchParams.get('redirect') || '/home';
      navigate(redirectTo);
    }
  }, [isAuthenticated, navigate]);

  // Update error state if authError changes
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setError('Connecting to server...');
      const result = await login(email, password);
      if (result && result.success) {
        // Navigation is handled by the useEffect that watches isAuthenticated
      } else {
        setError(result?.message || 'Login failed. Please check your credentials and try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err.message.includes('Network Error') || err.message.includes('ECONNREFUSED')) {
        setError('Cannot connect to the server. Please make sure the backend server is running.');
      } else {
        setError(err.message || 'An error occurred during login');
      }
    }
  };

  return (
    <div className="relative min-h-[80vh] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <video autoPlay loop muted className="absolute inset-0 w-full h-full object-cover z-0">
        <source src={assets.smoke} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black bg-opacity-60"></div>
      <div className="glass p-4 max-w-sm mx-auto max-h-[70vh] overflow-y-auto z-10 animate-fade-in sm:p-6 md:p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold gradient-text mb-2 sm:text-4xl">Welcome Back</h1>
          <p className="text-gray-400 text-sm sm:text-base">Sign in to your account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-200 sm:text-base">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full neumorphic-input"
              placeholder="Enter your email"
              required
              disabled={isLoading}
            />
          </div>
          <div>
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-200 sm:text-base">Password</label>
              <Link to="/password?type=reset" className="text-sm text-cyan-400 hover:text-teal-400 transition-colors">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full neumorphic-input"
              placeholder="Enter your password"
              required
              disabled={isLoading}
            />
          </div>
          {error && (
            <div className="text-red-400 text-sm mb-2 text-center">
              {error}
            </div>
          )}
          <button
            type="submit"
            className="w-full gradient-btn animate-pulse-slow flex justify-center items-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </>
            ) : 'Sign In'}
          </button>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-2 bg-gray-900 text-gray-400 text-sm">Or continue with</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <button
              type="button"
              className="flex items-center justify-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-2 rounded-lg transition-all duration-200 hover:shadow-cyan-500/20 text-sm sm:text-base"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M10 0C4.477 0 0 4.477 0 10c0 4.42 2.865 8.166 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.933.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C17.14 18.16 20 14.416 20 10c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
              </svg>
              GitHub
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-cyan-400 to-teal-400 text-white px-3 py-2 rounded-lg transition-all duration-200 hover:shadow-cyan-500/20 text-sm sm:text-base"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
              </svg>
              Google
            </button>
          </div>
          <p className="text-center text-sm text-gray-400 mt-4 sm:mt-5 sm:text-base">
            Don't have an account?{' '}
            <Link to="/signup" className="gradient-text hover:text-teal-400 font-medium transition-colors">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;