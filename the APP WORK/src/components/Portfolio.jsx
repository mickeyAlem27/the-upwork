import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiUser, FiMail, FiPhone, FiMapPin, FiBriefcase, FiAward, FiBook, FiImage, FiFilm, FiCalendar, FiFile, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Portfolio = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth(); // Get current authenticated user from context
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [error, setError] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  // Function to handle media click and open modal
  const handleMediaClick = (postsWithMedia, clickedPost, globalIndex) => {
    // Filter all posts that have media
    const allMediaPosts = posts.filter(post => post.mediaUrl);
    // Find the index of the clicked post in all media posts
    const clickedIndex = allMediaPosts.findIndex(post => post._id === clickedPost._id);
    setSelectedMedia(allMediaPosts);
    setCurrentMediaIndex(clickedIndex);
  };

  // Function to handle navigating to previous media
  const handlePrevMedia = () => {
    setCurrentMediaIndex(prev => 
      prev === 0 ? selectedMedia.length - 1 : prev - 1
    );
  };

  // Function to handle navigating to next media
  const handleNextMedia = () => {
    setCurrentMediaIndex(prev => 
      prev === selectedMedia.length - 1 ? 0 : prev + 1
    );
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        
        // Validate userId format (basic validation for MongoDB ObjectId)
        if (!userId || typeof userId !== 'string' || userId.length !== 24) {
          setError('Invalid user ID format');
          setLoading(false);
          return;
        }
        
        // If we have current user context and the ID matches, use context data
        if (currentUser && userId === currentUser._id) {
          setUser(currentUser);
          // Fetch posts for current user
          fetchUserPosts(userId);
          setLoading(false);
          return;
        }
        
        // For other users, fetch from API
        const response = await api.get(`/users/${userId}`);
        
        if (response.data && response.data._id) {
          // The API returns the user object directly, not in a success/data wrapper
          setUser(response.data);
          // Fetch posts for this user
          fetchUserPosts(userId);
        } else {
          setError('User not found');
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        if (err.response?.status === 404) {
          // If user is trying to view their own profile but it's not found via API,
          // try to use the context user data as fallback
          if (currentUser && userId === currentUser._id) {
            setUser(currentUser);
            fetchUserPosts(userId);
            setLoading(false);
            return;
          }
          setError('User not found');
        } else if (err.response?.status === 401) {
          setError('Authentication required');
          // Redirect to login if unauthorized
          navigate('/login');
        } else {
          setError('Failed to load user profile');
        }
      } finally {
        setLoading(false);
      }
    };

    const fetchUserPosts = async (userId) => {
      try {
        setLoadingPosts(true);
        const response = await api.get(`/posts/user/${userId}`);
        
        if (response.data && response.data.data) {
          setPosts(response.data.data);
        } else {
          setPosts([]);
        }
      } catch (err) {
        console.error('Error fetching user posts:', err);
        setPosts([]);
      } finally {
        setLoadingPosts(false);
      }
    };

    if (userId) {
      fetchUserProfile();
    } else {
      setLoading(false);
      setError('User ID not provided');
    }
  }, [userId, currentUser, navigate]);

  const getAvatarUrl = (user, size = 200) => {
    if (!user) return '';
    
    if (user.photo) {
      // If photo starts with http, it's already a full URL
      return user.photo.startsWith('http') ? user.photo : `http://localhost:5000${user.photo}`;
    }
    
    // Generate avatar from name if no photo available
    const firstName = user.firstName || 'User';
    const lastName = user.lastName || '';
    const encodedName = encodeURIComponent(`${firstName} ${lastName}`);
    return `https://ui-avatars.com/api/?name=${encodedName}&background=1f2937&color=fff&size=${size}`;
  };

  const getRoleDisplayName = (role) => {
    if (!role) return 'User';

    const roleMap = {
      'admin': 'Administrator',
      'moderator': 'Moderator',
      'premium': 'Premium User',
      'user': 'User',
      'member': 'Member',
      'guest': 'Guest',
      'promoter': 'Promoter',
      'brand': 'Brand'
    };

    return roleMap[role.toLowerCase()] || role.charAt(0).toUpperCase() + role.slice(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-medium mb-2 text-red-400">Error Loading Profile</h2>
          <p className="text-gray-300 mb-4">{error || 'User not found'}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
        </div>

        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Cover Image Placeholder */}
          <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600"></div>
          
          {/* Profile Info */}
          <div className="px-6 pb-6">
            <div className="flex flex-col md:flex-row items-center -mt-16">
              <div className="relative">
                <img
                  src={getAvatarUrl(user)}
                  alt={`${user.firstName} ${user.lastName}`}
                  className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                  onError={(e) => {
                    e.target.src = getAvatarUrl(user);
                  }}
                />
                <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              
              <div className="mt-4 md:mt-0 md:ml-6 text-center md:text-left">
                <h1 className="text-3xl font-bold text-gray-900">
                  {user.firstName} {user.lastName}
                </h1>
                <p className="text-lg text-gray-600 mt-1">
                  {getRoleDisplayName(user.role)}
                </p>
                <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-3">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    Member since {user.createdAt ? new Date(user.createdAt).getFullYear() : new Date().getFullYear()}
                  </span>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Sections */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Contact Info and Bio */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <FiUser className="mr-2 text-gray-600" />
                Contact Information
              </h2>
              
              <div className="space-y-4">
                {user.email && (
                  <div className="flex items-center">
                    <FiMail className="mr-3 text-gray-400 text-lg" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{user.email}</p>
                    </div>
                  </div>
                )}
                
                {user.phone && (
                  <div className="flex items-center">
                    <FiPhone className="mr-3 text-gray-400 text-lg" />
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium">{user.phone}</p>
                    </div>
                  </div>
                )}
                
                {user.location && (
                  <div className="flex items-center">
                    <FiMapPin className="mr-3 text-gray-400 text-lg" />
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-medium">{user.location}</p>
                    </div>
                  </div>
                )}
                
                {user.jobTitle && (
                  <div className="flex items-center">
                    <FiBriefcase className="mr-3 text-gray-400 text-lg" />
                    <div>
                      <p className="text-sm text-gray-500">Job Title</p>
                      <p className="font-medium">{user.jobTitle}</p>
                    </div>
                  </div>
                )}
                
                {user.company && (
                  <div className="flex items-center">
                    <FiBriefcase className="mr-3 text-gray-400 text-lg" />
                    <div>
                      <p className="text-sm text-gray-500">Company</p>
                      <p className="font-medium">{user.company}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* About/Biography */}
            {user.bio && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <FiBook className="mr-2 text-gray-600" />
                  About
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  {user.bio}
                </p>
              </div>
            )}

            {/* Skills */}
            {user.skills && user.skills.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <FiAward className="mr-2 text-gray-600" />
                  Skills
                </h2>
                <div className="flex flex-wrap gap-2">
                  {user.skills.map((skill, index) => (
                    <span 
                      key={index}
                      className="px-3 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* User Posts */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <FiBook className="mr-2 text-gray-600" />
                Posts ({posts.length})
              </h2>
              
              {loadingPosts ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FiBook className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                  <p>No posts yet</p>
                </div>
              ) : (
                <>
                  {/* Media Gallery Preview */}
                  {posts.some(post => post.mediaUrl) && (
                    <div className="mb-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                        <FiImage className="mr-2 text-gray-600" />
                        Media Gallery
                      </h3>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {posts
                          .filter(post => post.mediaUrl)
                          .slice(0, 9) // Show first 9 media items in gallery
                          .map((post, index) => (
                            <div 
                              key={`${post._id}-${index}`} 
                              className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => {
                                // Scroll to the full post when clicking gallery item
                                const fullPostElement = document.getElementById(`post-${post._id}`);
                                if (fullPostElement) {
                                  fullPostElement.scrollIntoView({ behavior: 'smooth' });
                                }
                              }}
                            >
                              {/* Determine if media is an image based on extension and type */}
                              {(post.mediaType?.startsWith('image/') || /\.(jpe?g|png|gif|bmp|webp)$/i.test(post.mediaUrl)) ? (
                                <img
                                  src={post.mediaUrl.startsWith('http') ? post.mediaUrl : 
                                       post.mediaUrl.startsWith('/uploads') ? `http://localhost:5000${post.mediaUrl}` : 
                                       post.mediaUrl.startsWith('/') ? `http://localhost:5000${post.mediaUrl}` :
                                       `http://localhost:5000/uploads/${post.mediaUrl}`}
                                  alt="Media preview"
                                  className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = `https://via.placeholder.com/150/cccccc/666666?text=Img`;
                                  }}
                                  onClick={() => handleMediaClick(posts.filter(p => p.mediaUrl), post, posts.findIndex(p => p._id === post._id))}
                                />
                              ) : post.mediaType?.startsWith('video/') ? (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors"
                                  onClick={() => handleMediaClick(posts.filter(p => p.mediaUrl), post, posts.findIndex(p => p._id === post._id))}
                                >
                                  <FiFilm className="text-gray-500 text-xl" />
                                </div>
                              ) : (
                                <div className="w-full h-full bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
                                  onClick={() => handleMediaClick(posts.filter(p => p.mediaUrl), post, posts.findIndex(p => p._id === post._id))}
                                >
                                  <FiFile className="text-gray-500 text-xl" />
                                </div>
                              )}
                            </div>
                          ))}
                        {posts.filter(post => post.mediaUrl).length > 9 && (
                          <div className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center">
                            <span className="text-gray-500 font-medium">
                              +{posts.filter(post => post.mediaUrl).length - 9}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* All Posts */}
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <div 
                        id={`post-${post._id}`} 
                        key={post._id} 
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-start mb-3">
                          <img
                            src={getAvatarUrl(user, 32)}
                            alt={`${user.firstName} ${user.lastName}`}
                            className="w-8 h-8 rounded-full mr-3 object-cover"
                            onError={(e) => {
                              e.target.src = getAvatarUrl(user, 32);
                            }}
                          />
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">
                              {user.firstName} {user.lastName}
                            </h3>
                            <p className="text-xs text-gray-500 flex items-center">
                              <FiCalendar className="mr-1" />
                              {new Date(post.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        
                        <p className="text-gray-700 mb-3">{post.text}</p>
                        
                        {post.mediaUrl && (
                          <div className="mb-3">
                            {/* Determine if media is an image based on extension and type */}
                            {(post.mediaType?.startsWith('image/') || /\.(jpe?g|png|gif|bmp|webp)$/i.test(post.mediaUrl)) ? (
                              <div className="relative group">
                                <img
                                  src={post.mediaUrl.startsWith('http') ? post.mediaUrl : 
                                       post.mediaUrl.startsWith('/uploads') ? `http://localhost:5000${post.mediaUrl}` : 
                                       post.mediaUrl.startsWith('/') ? `http://localhost:5000${post.mediaUrl}` :
                                       `http://localhost:5000/uploads/${post.mediaUrl}`}
                                  alt="Post media"
                                  className="max-w-full h-auto max-h-96 rounded-lg cursor-pointer hover:opacity-90 transition-opacity object-cover"
                                  onError={(e) => {
                                    // Fallback if image fails to load
                                    e.target.onerror = null;
                                    e.target.src = `https://via.placeholder.com/400x300/cccccc/666666?text=Image+Not+Found`;
                                  }}
                                  onClick={() => handleMediaClick(posts.filter(p => p.mediaUrl), post, posts.findIndex(p => p._id === post._id))}
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                                  <span className="text-white font-semibold">
                                    <FiImage className="mr-1 inline" /> Click to view
                                  </span>
                                </div>
                              </div>
                            ) : post.mediaType?.startsWith('video/') ? (
                              <div className="relative group">
                                <video
                                  src={post.mediaUrl.startsWith('http') ? post.mediaUrl : 
                                       post.mediaUrl.startsWith('/uploads') ? `http://localhost:5000${post.mediaUrl}` : 
                                       post.mediaUrl.startsWith('/') ? `http://localhost:5000${post.mediaUrl}` :
                                       `http://localhost:5000/uploads/${post.mediaUrl}`}
                                  controls
                                  className="max-w-full max-h-96 rounded-lg cursor-pointer"
                                  onClick={() => handleMediaClick(posts.filter(p => p.mediaUrl), post, posts.findIndex(p => p._id === post._id))}
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                                  <span className="text-white font-semibold">
                                    <FiFilm className="mr-1 inline" /> Click to view
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center p-4 bg-gray-100 rounded-lg border border-dashed border-gray-300 hover:bg-gray-200 transition-colors cursor-pointer"
                                onClick={() => handleMediaClick(posts.filter(p => p.mediaUrl), post, posts.findIndex(p => p._id === post._id))}>
                                <div className="flex items-center">
                                  <FiFile className="mr-3 text-gray-500 text-xl" />
                                  <div>
                                    <p className="font-medium text-gray-700">Media File</p>
                                    <p className="text-xs text-gray-500">{post.mediaType || 'File'}</p>
                                  </div>
                                </div>
                                <div className="ml-auto text-blue-600">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Column - Action Buttons */}
          <div className="space-y-6">
            {/* Action Buttons */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              
              <div className="space-y-3">
                {currentUser && userId === currentUser._id ? (
                  // If viewing own profile, show edit button
                  <button
                    onClick={() => navigate('/profile')}
                    className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FiUser className="w-5 h-5 mr-2" />
                    Edit Profile
                  </button>
                ) : (
                  // If viewing other user's profile, show message button
                  <button
                    onClick={() => navigate(`/messages?userId=${user._id}`)}
                    className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Message
                  </button>
                )}
                
                {!(currentUser && userId === currentUser._id) && (
                  <button
                    onClick={() => navigate('/')}
                    className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Connect
                  </button>
                )}
                
                <button
                  onClick={() => {
                    // Share functionality would go here
                    navigator.clipboard.writeText(window.location.href);
                    alert('Profile link copied to clipboard!');
                  }}
                  className="w-full flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  Share Profile
                </button>
              </div>
            </div>

            {/* User Stats */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">User Stats</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Posts</span>
                  <span className="font-semibold text-gray-900">12</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Followers</span>
                  <span className="font-semibold text-gray-900">342</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Following</span>
                  <span className="font-semibold text-gray-900">156</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Response Rate</span>
                  <span className="font-semibold text-green-600">98%</span>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Info</h3>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Member since</p>
                  <p className="font-medium">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Last Active</p>
                  <p className="font-medium">
                    {user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Media Modal */}
          {selectedMedia && (
            <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
              <div className="relative w-full max-w-4xl max-h-full">
                {/* Close button */}
                <button
                  onClick={() => setSelectedMedia(null)}
                  className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
                >
                  <FiX className="text-gray-800" />
                </button>

                {/* Navigation buttons */}
                {selectedMedia.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevMedia}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-white rounded-full p-3 shadow-lg hover:bg-gray-100 transition-colors"
                    >
                      <FiChevronLeft className="text-gray-800 text-xl" />
                    </button>
                    <button
                      onClick={handleNextMedia}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-white rounded-full p-3 shadow-lg hover:bg-gray-100 transition-colors"
                    >
                      <FiChevronRight className="text-gray-800 text-xl" />
                    </button>
                  </>
                )}

                {/* Media display */}
                <div className="bg-white rounded-lg overflow-hidden max-h-[80vh]">
                  {/* Determine if media is an image based on extension and type */}
                  {(selectedMedia[currentMediaIndex]?.mediaType?.startsWith('image/') || /\.(jpe?g|png|gif|bmp|webp)$/i.test(selectedMedia[currentMediaIndex]?.mediaUrl || '')) ? (
                    <img
                      src={selectedMedia[currentMediaIndex].mediaUrl.startsWith('http') 
                        ? selectedMedia[currentMediaIndex].mediaUrl 
                        : selectedMedia[currentMediaIndex].mediaUrl.startsWith('/uploads') 
                          ? `http://localhost:5000${selectedMedia[currentMediaIndex].mediaUrl}`
                          : selectedMedia[currentMediaIndex].mediaUrl.startsWith('/') 
                            ? `http://localhost:5000${selectedMedia[currentMediaIndex].mediaUrl}`
                            : `http://localhost:5000/uploads/${selectedMedia[currentMediaIndex].mediaUrl}`}
                      alt="Full size media"
                      className="max-w-full max-h-[70vh] object-contain mx-auto"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://via.placeholder.com/800x600/cccccc/666666?text=Image+Not+Found`;
                      }}
                    />
                  ) : selectedMedia[currentMediaIndex]?.mediaType?.startsWith('video/') ? (
                    <video
                      src={selectedMedia[currentMediaIndex].mediaUrl.startsWith('http') 
                        ? selectedMedia[currentMediaIndex].mediaUrl 
                        : selectedMedia[currentMediaIndex].mediaUrl.startsWith('/uploads') 
                          ? `http://localhost:5000${selectedMedia[currentMediaIndex].mediaUrl}`
                          : selectedMedia[currentMediaIndex].mediaUrl.startsWith('/') 
                            ? `http://localhost:5000${selectedMedia[currentMediaIndex].mediaUrl}`
                            : `http://localhost:5000/uploads/${selectedMedia[currentMediaIndex].mediaUrl}`}
                      controls
                      className="max-w-full max-h-[70vh] object-contain mx-auto"
                      autoPlay
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12">
                      <FiFile className="text-gray-400 text-6xl mb-4" />
                      <p className="text-gray-600 text-lg">File: {selectedMedia[currentMediaIndex]?.mediaType || 'Unknown File'}</p>
                      <a 
                        href={selectedMedia[currentMediaIndex].mediaUrl.startsWith('http') 
                          ? selectedMedia[currentMediaIndex].mediaUrl 
                          : selectedMedia[currentMediaIndex].mediaUrl.startsWith('/uploads') 
                            ? `http://localhost:5000${selectedMedia[currentMediaIndex].mediaUrl}`
                            : selectedMedia[currentMediaIndex].mediaUrl.startsWith('/') 
                              ? `http://localhost:5000${selectedMedia[currentMediaIndex].mediaUrl}`
                              : `http://localhost:5000/uploads/${selectedMedia[currentMediaIndex].mediaUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Download File
                      </a>
                    </div>
                  )}
                  
                  {/* Media info */}
                  <div className="p-4 bg-gray-50 border-t">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{selectedMedia[currentMediaIndex]?.text || 'Media Post'}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(selectedMedia[currentMediaIndex]?.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-sm text-gray-500">
                        {currentMediaIndex + 1} of {selectedMedia.length}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Portfolio;