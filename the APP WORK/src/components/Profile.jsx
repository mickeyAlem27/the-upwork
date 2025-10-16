import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FiSearch, FiSettings, FiLogOut, FiMoon, FiUser, FiEdit } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import assets from '../assets/assets.js';
import { authAPI, postsAPI } from '../services/api';
import api from '../services/api';


function Profile() {
  const { userId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user: authUser, isAuthenticated, logout: authLogout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [error, setError] = useState(null);
  const dropdownRef = useRef(null);

  // Check if this is the current user's profile
  const isCurrentUser = !userId || (authUser && (authUser._id === userId || authUser.id === userId));

  // Handle invalid user IDs
  if (userId === 'unknown' || (userId && !isCurrentUser && !authUser)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Profile Not Available</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">This user profile cannot be loaded.</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }
  
  // Handle invalid user IDs
  if (userId === 'unknown' || (userId && !isCurrentUser && !authUser)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Profile Not Available</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">This user profile cannot be loaded.</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }
  
  // Debug logs
  console.log('Profile Debug - Auth User:', authUser);
  console.log('Profile Debug - User ID from URL:', userId);
  console.log('Profile Debug - User Profile State:', userProfile);

  // Set user profile from auth context
  useEffect(() => {
    console.log('Profile - Auth User:', authUser);
    console.log('Profile - User ID from URL:', userId);

    const fetchUserProfile = async () => {
      try {
        setIsLoading(true);
        let userData;

        if (isCurrentUser && authUser) {
          // For current user, use auth context - this will be updated after profile changes
          console.log('Using auth user data for current user:', authUser);
          userData = {
            ...authUser,
            photo: authUser.photo ? `http://localhost:5000${authUser.photo}` : null
          };
        } else if (userId && userId !== 'unknown' && userId !== authUser?._id && userId !== authUser?.id) {
          // For other users, fetch their profile from database
          try {
            console.log('Fetching user data for ID:', userId);
            const response = await api.get(`/users/${userId}`);
            userData = {
              ...response.data,
              photo: response.data.photo ? `http://localhost:5000${response.data.photo}` : null
            };
            console.log('Fetched user data:', userData);
          } catch (error) {
            console.error('Error fetching user profile:', error);
            // For demo/test users, create mock profile data
            if (userId.match(/^[0-9a-f]{24}$/)) {
              // This looks like a MongoDB ObjectId but user doesn't exist in database
              setError('User not found in database');
              return;
            } else {
              setError('User not found');
              return;
            }
          }
        } else if (location.state?.user) {
          // If user data was passed via location state
          userData = {
            ...location.state.user,
            photo: location.state.user.photo ? `http://localhost:5000${location.state.user.photo}` : null
          };
        }

        if (userData) {
          console.log('Profile - Setting user data:', userData);
          setUserProfile(userData);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [authUser, userId, isCurrentUser, location.state]);

  // Fetch posts for this profile
  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoadingPosts(true);
        const targetId = userId || authUser?._id || authUser?.id || userProfile?._id || userProfile?.id;
        if (!targetId) return;
        const res = await postsAPI.getUserPosts(targetId);
        setPosts(res.data || []);
      } catch (e) {
        console.error('Failed to load posts:', e);
      } finally {
        setLoadingPosts(false);
      }
    };
    loadPosts();
  }, [userId, authUser, userProfile]);
  // Get user data with proper fallbacks
  const getUserData = () => {
    // Use the userProfile state which is already properly set in the useEffect
    const targetUser = userProfile;

    if (!targetUser) {
      console.log('No user data available, using default values');
      return {
        firstName: "",
        lastName: "",
        email: "",
        role: "User",
        bio: "No bio available",
        skills: [],
        photo: null,
        phone: "",
        location: "",
        website: "",
        company: "",
        jobTitle: "",
        joinedDate: new Date().toISOString(),
        socialLinks: {}
      };
    }

    console.log('Using user data from userProfile:', targetUser);

    // Return complete user data with fallbacks
    const userData = {
      firstName: targetUser.firstName || "",
      lastName: targetUser.lastName || "",
      email: targetUser.email || "",
      username: targetUser.username || "",
      role: targetUser.role || "User",
      bio: targetUser.bio || "No bio available",
      skills: Array.isArray(targetUser.skills) ? targetUser.skills : [],
      photo: targetUser.photo,
      phone: targetUser.phone || "",
      location: targetUser.location || "",
      website: targetUser.website || "",
      company: targetUser.company || "",
      jobTitle: targetUser.jobTitle || "",
      joinedDate: targetUser.createdAt || targetUser.joinedDate || new Date().toISOString(),
      socialLinks: targetUser.socialLinks || {}
    };

    console.log('Processed user data:', userData);
    return userData;
  };

  const userData = getUserData();
  
  // Debug logs
  console.log('Profile Component - User Data:', userData);
  console.log('Auth User:', authUser);
  console.log('Location State User:', location.state?.user);
  
  // Get display name - try different fallbacks
  let displayName = '';
  if (userData?.firstName || userData?.lastName) {
    displayName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
  } else if (userProfile?.username) {
    displayName = userProfile.username;
  } else if (authUser?.username) {
    displayName = authUser.username;
  } else {
    displayName = 'User';
  }
  
  const fullName = displayName;
  const isOwnProfile = isCurrentUser || (authUser && userProfile && (authUser._id === userProfile._id || authUser.id === userProfile.id));
  
  // Fallback avatar URL using UI Avatars API with initials
  const getAvatarUrl = (name, size = 200) => {
    if (userData.photo) return userData.photo;
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random&size=${size}&color=fff&bold=true`;
  };
  
  const avatarUrl = getAvatarUrl(fullName);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    authLogout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">User Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <button 
              onClick={() => navigate(-1)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              &larr; Back
            </button>
            <h1 className="text-xl font-bold">
              {isOwnProfile ? 'Your Profile' : `${fullName}'s Profile`}
            </h1>
            {isOwnProfile && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-2 focus:outline-none p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
                  aria-label="Toggle settings menu"
                >
                  <FiSettings className="w-5 h-5" />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-gray-800/90 backdrop-blur-md rounded-lg shadow-xl border border-gray-700 overflow-hidden">
                    <button
                      onClick={() => navigate('/biography')}
                      className="w-full px-4 py-3 text-left text-gray-200 hover:bg-gray-700/80 transition-colors duration-200 flex items-center"
                      aria-label="Go to settings"
                    >
                      <FiSettings className="w-5 h-5 mr-3" />
                      <span>Settings</span>
                    </button>
                    <button
                      onClick={() => {
                        setDarkMode(!darkMode);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full px-4 py-3 text-left text-gray-200 hover:bg-gray-700/80 transition-colors duration-200 flex items-center"
                      aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                      {darkMode ? (
                        <>
                          <FiSun className="w-5 h-5 mr-3" />
                          <span>Light Mode</span>
                        </>
                      ) : (
                        <>
                          <FiMoon className="w-5 h-5 mr-3" />
                          <span>Dark Mode</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsDropdownOpen(false);
                      }}
                      className="w-full px-4 py-3 text-left text-red-400 hover:bg-gray-700/80 transition-colors duration-200 flex items-center"
                      aria-label="Log out"
                    >
                      <FiLogOut className="w-5 h-5 mr-3" />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
          {/* Cover Photo with Gradient Overlay */}
          <div className="h-48 bg-gradient-to-r from-blue-500 to-teal-400 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
          </div>
          
          {/* Profile Header */}
          <div className="px-6 pb-6 sm:px-10 -mt-20 relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between">
              <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-8 w-full">
                {/* Profile Picture */}
                <div className="relative group">
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-teal-400 rounded-full opacity-20 blur-sm group-hover:opacity-30 transition-opacity duration-200"></div>
                    <img
                      className="relative h-40 w-40 rounded-full border-4 border-white dark:border-gray-800 bg-white dark:bg-gray-700 object-cover shadow-lg"
                      src={avatarUrl}
                      alt={fullName}
                      onError={(e) => {
                        e.target.onerror = null;
                        const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase();
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random&size=200&color=fff&bold=true`;
                      }}
                    />
                    {isOwnProfile && (
                      <button
                        onClick={() => navigate('/biography')}
                        className="absolute -bottom-2 -right-2 bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-full shadow-lg transform transition-all duration-200 hover:scale-110 hover:shadow-xl flex items-center justify-center"
                        title="Edit profile"
                      >
                        <FiEdit className="h-4 w-4" />
                        <span className="sr-only">Edit profile</span>
                      </button>
                    )}
                  </div>
                </div>
                
                {/* User Info */}
                <div className="flex-1 text-center sm:text-left space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                    <div>
                      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                        {fullName}
                      </h1>
                      <div className="flex items-center justify-center sm:justify-start space-x-2 mt-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                          {userData.role || 'User'}
                        </span>
                        {userData.jobTitle && (
                          <span className="text-gray-600 dark:text-gray-300 text-sm">
                            {userData.jobTitle}
                            {userData.company && ` at ${userData.company}`}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {isOwnProfile ? (
                      <div className="mt-4 sm:mt-0">
                        <button
                          onClick={() => navigate('/biography')}
                          className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                        >
                          <FiEdit className="mr-2 h-4 w-4" />
                          Edit Profile
                        </button>
                      </div>
                    ) : (
                      <div className="mt-4 sm:mt-0 flex space-x-3">
                        <button className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                          Follow
                        </button>
                        <button className="inline-flex items-center px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                          Message
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Contact Info */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm text-gray-600 dark:text-gray-300">
                    {userData.email && (
                      <div className="flex items-center">
                        <svg className="h-4 w-4 mr-1.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <a href={`mailto:${userData.email}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          {userData.email}
                        </a>
                      </div>
                    )}
                    {userData.phone && (
                      <div className="flex items-center">
                        <svg className="h-4 w-4 mr-1.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <a href={`tel:${userData.phone}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          {userData.phone}
                        </a>
                      </div>
                    )}
                    {userData.location && (
                      <div className="flex items-center">
                        <svg className="h-4 w-4 mr-1.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{userData.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bio and Additional Info */}
            <div className="px-6 pb-6 sm:px-10 mt-6">
              {(userData.bio || userData.jobTitle || userData.company || userData.location) && (
                <div className="space-y-4">
                  {userData.bio && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">About</h3>
                      <p className="text-gray-700 dark:text-gray-300">{userData.bio}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(userData.jobTitle || userData.company) && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Work</h4>
                        <p className="text-gray-900 dark:text-white">
                          {userData.jobTitle && <span className="block">{userData.jobTitle}</span>}
                          {userData.company && <span className="text-gray-600 dark:text-gray-400">{userData.company}</span>}
                        </p>
                      </div>
                    )}

                    {userData.location && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Location</h4>
                        <div className="flex items-center text-gray-900 dark:text-white">
                          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {userData.location}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Skills */}
              {userData.skills?.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {userData.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Additional Info */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-6 sm:px-10 bg-gray-50 dark:bg-gray-700/30">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Personal</h4>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</p>
                  <p className="mt-1 text-gray-900 dark:text-white">{fullName || 'Not provided'}</p>
                </div>
                {userData.jobTitle && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Title</p>
                    <p className="mt-1 text-gray-900 dark:text-white">{userData.jobTitle}</p>
                  </div>
                )}
                {userData.company && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Company</p>
                    <p className="mt-1 text-gray-900 dark:text-white">{userData.company}</p>
                  </div>
                )}
              </div>

              {/* Contact Details */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</h4>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                  <a 
                    href={`mailto:${userData.email}`}
                    className="mt-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {userData.email || 'Not provided'}
                  </a>
                </div>
                {userData.phone && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</p>
                    <a 
                      href={`tel:${userData.phone}`}
                      className="mt-1 text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {userData.phone}
                    </a>
                  </div>
                )}
                {userData.location && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Location</p>
                    <p className="mt-1 text-gray-900 dark:text-white">{userData.location}</p>
                  </div>
                )}
              </div>

              {/* Additional Information */}
              <div className="md:col-span-2 space-y-4">
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Member Since</p>
                      <p className="mt-1 text-gray-900 dark:text-white">
                        {userData.joinedDate 
                          ? new Date(userData.joinedDate).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Role</p>
                      <p className="mt-1 text-gray-900 dark:text-white capitalize">
                        {userData.role?.toLowerCase() || 'User'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Posts Section */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 mt-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700">
            <div className="px-6 py-4 sm:px-10 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Posts</h3>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {loadingPosts ? (
                <div className="p-6 text-gray-500">Loading posts...</div>
              ) : posts.length === 0 ? (
                <div className="p-6 text-gray-500">No posts yet.</div>
              ) : (
                posts.map((p) => (
                  <div key={p._id} className="p-6">
                    {p.text && <p className="mb-3 text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{p.text}</p>}
                    {p.mediaUrl && (
                      p.mediaType === 'video' ? (
                        <video src={`http://localhost:5000${p.mediaUrl}`} controls className="w-full rounded-lg" />
                      ) : (
                        <img src={`http://localhost:5000${p.mediaUrl}`} alt="post media" className="w-full rounded-lg object-cover" />
                      )
                    )}
                    <div className="mt-2 text-xs text-gray-500">
                      {new Date(p.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Profile;