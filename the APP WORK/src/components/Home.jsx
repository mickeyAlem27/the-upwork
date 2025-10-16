import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Assuming this is your auth context
import { postsAPI, jobsAPI } from '../services/api';
import api from '../services/api';
import assets from '../assets/assets';
import {
  FiSettings,
  FiLogOut,
  FiUser,
  FiPlus,
  FiBriefcase,
  FiHeart,
  FiMessageSquare,
  FiShare2,
  FiSun,
  FiMoon,
  FiUsers,
} from 'react-icons/fi';

// Mock data (ideally fetched from an API)
const mockPosts = [
  {
    id: 1,
    user: {
      id: '507f1f77bcf86cd799439011', // Valid MongoDB ObjectId format
      name: 'John Doe',
      role: 'Promoter',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      bio: 'Creative promoter with 5+ years of experience in digital marketing',
      skills: ['Photography', 'Marketing', 'Social Media'],
    },
    content: {
      type: 'photo',
      url: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800&auto=format&fit=crop&q=60',
      text: 'Check out my latest work for a major fashion brand! #fashion #photography',
      likes: 42,
      comments: 8,
      shares: 5,
      timeAgo: '2h ago',
    },
  },
  {
    id: 2,
    user: {
      id: '507f1f77bcf86cd799439012', // Valid MongoDB ObjectId format
      name: 'Jane Smith',
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
      role: 'Content Creator',
      bio: 'Video content creator specializing in lifestyle and travel',
      skills: ['Videography', 'Editing', 'Storytelling'],
    },
    content: {
      type: 'video',
      url: 'https://www.w3schools.com/html/mov_bbb.mp4',
      text: 'New travel vlog is up! Check out these amazing destinations 🌍✈️ #travel #vlog',
      likes: 128,
      comments: 24,
      shares: 15,
      timeAgo: '5h ago',
    },
  },
  {
    id: 3,
    user: {
      id: '507f1f77bcf86cd799439013', // Valid MongoDB ObjectId format
      name: 'Alex Johnson',
      avatar: 'https://randomuser.me/api/portraits/men/67.jpg',
      role: 'Event Promoter',
      bio: 'Bringing people together through amazing events',
      skills: ['Event Planning', 'Networking', 'Branding'],
    },
    content: {
      type: 'photo',
      url: 'https://images.unsplash.com/photo-1505373876331-ff89e4fdbfe7?w=800&auto=format&fit=crop&q=60',
      text: "Last night's event was a huge success! Thanks to everyone who came out. #event #networking",
      likes: 89,
      comments: 12,
      shares: 7,
      timeAgo: '1d ago',
    },
  },
];

const featuredCreators = [
  { id: '507f1f77bcf86cd799439014', name: 'Sarah Wilson', role: 'Influencer', avatar: 'https://randomuser.me/api/portraits/women/63.jpg' },
  { id: '507f1f77bcf86cd799439015', name: 'Mike Chen', role: 'Photographer', avatar: 'https://randomuser.me/api/portraits/men/75.jpg' },
  { id: '507f1f77bcf86cd799439016', name: 'Emma Davis', role: 'Marketer', avatar: 'https://randomuser.me/api/portraits/women/22.jpg' },
  { id: '507f1f77bcf86cd799439017', name: 'David Kim', role: 'Videographer', avatar: 'https://randomuser.me/api/portraits/men/45.jpg' },
  { id: '507f1f77bcf86cd799439018', name: 'Lisa Wong', role: 'Social Media', avatar: 'https://randomuser.me/api/portraits/women/18.jpg' },
  { id: '507f1f77bcf86cd799439019', name: 'James Wilson', role: 'Brand Manager', avatar: 'https://randomuser.me/api/portraits/men/29.jpg' },
];

function Home() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]); // Real posts from API
  const [jobs, setJobs] = useState([]); // Real jobs from API
  const [featuredCreators, setFeaturedCreators] = useState([]); // Real featured creators from API
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    // Initialize based on system preference or localStorage
    return localStorage.getItem('darkMode') === 'true' || window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const settingsRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Set dark mode class and persist preference
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);
  // Fetch real jobs from API
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log('🔄 Fetching jobs from API...');

        const response = await jobsAPI.getJobs();
        console.log('📋 Jobs API response:', response);

        // Handle different response formats
        let jobsData = [];
        if (response.data) {
          jobsData = Array.isArray(response.data) ? response.data : response.data.data || [];
        } else if (Array.isArray(response)) {
          jobsData = response;
        }

        console.log('📋 Processed jobs data:', jobsData.length);
        setJobs(jobsData);
      } catch (err) {
        console.error('❌ Error fetching jobs:', err);
        setError('Failed to load jobs. Please try again later.');
        // Fallback to empty jobs array
        setJobs([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchJobs();
    }
  }, [isAuthenticated]);

  // Fetch featured creators (real users from database)
  useEffect(() => {
    const fetchFeaturedCreators = async () => {
      try {
        console.log('🔄 Fetching featured creators...');
        const response = await api.get('/users');

        // Handle different response formats
        let usersData = [];
        if (response.data) {
          usersData = Array.isArray(response.data) ? response.data : response.data.data || [];
        }

        // Filter out current user and limit to 6 for featured creators
        const creators = usersData
          .filter(u => u._id !== user?._id && u._id !== user?.id)
          .slice(0, 6)
          .map(u => ({
            id: u._id,
            name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'User',
            role: u.role || 'User',
            avatar: u.photo ? `http://localhost:5000${u.photo}` : `https://ui-avatars.com/api/?name=${encodeURIComponent((u.firstName || '') + ' ' + (u.lastName || ''))}&background=1f2937&color=fff`
          }));

        console.log('📋 Featured creators:', creators.length);
        setFeaturedCreators(creators);
      } catch (err) {
        console.error('❌ Error fetching featured creators:', err);
        // Fallback to empty array
        setFeaturedCreators([]);
      }
    };

    if (isAuthenticated && user) {
      fetchFeaturedCreators();
    }
  }, [isAuthenticated, user]);

  // Set user profile from auth context
  useEffect(() => {
    if (user && isAuthenticated) {
      const userData = user.data || user;
      const name = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'User';
      setUserProfile({
        id: userData._id || userData.id || 'current-user',
        avatar: userData.photo ? `http://localhost:5000${userData.photo}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1f2937&color=fff`,
        bio: userData.bio || 'No bio available',
        skills: userData.skills || [],
        role: userData.role || 'User',
        name,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
      });
      setIsLoading(false);
    } else if (!authLoading) {
      setIsLoading(false);
    }
  }, [user, isAuthenticated, authLoading]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/login');
    }
  };

  const handleProfileClick = (userId) => {
    if (!userId || userId === 'unknown') {
      console.error('Invalid user ID for profile navigation:', userId);
      return;
    }
    console.log('Navigating to profile:', userId);
    navigate(`/profile/${userId}`);
  };

  const handleCreatePost = () => {
    navigate('/create-post');
  };

  const isPromoter = userProfile?.role?.toLowerCase() === 'promoter';
  const isBrand = userProfile?.role?.toLowerCase() === 'brand';
  const canPostJobs = isPromoter;

  const handleCreateJob = () => {
    navigate('/create-job');
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-900 dark:bg-gray-900">
      {/* Background Video - Replaced with placeholder */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-0"
        poster="https://placehold.co/1920x1080/1f2937/ffffff?text=Background+Video"
      >
        <source src={assets.smoke} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900/90 via-gray-900/70 to-gray-900/90"></div>

      {/* Settings Button */}
      <div className="fixed top-4 right-4 z-50" ref={settingsRef}>
        <button
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className="p-2 rounded-full bg-gray-800/80 backdrop-blur-md text-white hover:bg-gray-700/90 transition-colors duration-200 shadow-lg"
          aria-label="Toggle settings menu"
        >
          <FiSettings className="w-6 h-6" />
        </button>

        {isSettingsOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-gray-800/90 backdrop-blur-md rounded-lg shadow-xl border border-gray-700 overflow-hidden">
            <button
              onClick={() => {
                navigate('/biography');
                setIsSettingsOpen(false);
              }}
              className="w-full px-4 py-3 text-left text-gray-200 hover:bg-gray-700/80 transition-colors duration-200 flex items-center"
              aria-label="Go to profile settings"
            >
              <FiSettings className="w-5 h-5 mr-3" />
              <span>Settings</span>
            </button>
            <button
              onClick={() => {
                toggleDarkMode();
                setIsSettingsOpen(false);
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
                setIsSettingsOpen(false);
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

      {/* Main Content */}
      <div className="relative z-10 pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* User Profile Section */}
        {userProfile && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-gray-700/50">
            <div className="flex items-center space-x-4">
              <div
                onClick={() => handleProfileClick(userProfile.id)}
                className="cursor-pointer"
                role="button"
                aria-label={`View ${userProfile.name}'s profile`}
              >
                {userProfile.avatar ? (
                  <img
                    src={userProfile.avatar}
                    alt={userProfile.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-blue-500 hover:border-blue-400 transition-all duration-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 transition-colors duration-200">
                    <FiUser className="text-2xl text-gray-400" />
                  </div>
                )}
              </div>
              <div>
                <span className="inline-block bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full mb-1 capitalize">
                  {userProfile.role}
                </span>
                <h2
                  className="text-xl font-bold text-white hover:text-blue-400 transition-colors duration-200 cursor-pointer"
                  onClick={() => handleProfileClick(userProfile.id)}
                >
                  {userProfile.name}
                </h2>
              </div>
            </div>
          </div>
        )}

        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent mb-4">
            Connect with Top Promoters
          </h1>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Discover amazing content creators, collaborate on projects, and grow your network in the promotion industry.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-6">
            <button
              onClick={handleCreatePost}
              className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-teal-500 to-blue-600 text-white font-medium rounded-full hover:shadow-lg hover:shadow-teal-500/20 transition-all duration-300 transform hover:-translate-y-0.5"
              aria-label="Create a new post"
            >
              <FiPlus className="mr-2" /> Create Post
            </button>

            {canPostJobs && (
              <button
                onClick={() => navigate('/create-job')}
                className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-full hover:shadow-lg hover:shadow-green-500/20 transition-all duration-300 transform hover:-translate-y-0.5"
                aria-label="Post a new job"
              >
                <FiBriefcase className="mr-2" /> Post Job
              </button>
            )}
          </div>
        </div>

        {/* Featured Creators */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Featured Creators</h2>
          {featuredCreators.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {featuredCreators.map((creator) => (
                <div
                  key={creator.id}
                  className="glass p-4 rounded-xl text-center cursor-pointer hover:bg-gray-800/50 transition-colors"
                  onClick={() => handleProfileClick(creator.id)}
                  role="button"
                  aria-label={`View ${creator.name}'s profile`}
                >
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full overflow-hidden border-2 border-teal-400/50">
                    <img src={creator.avatar} alt={creator.name} className="w-full h-full object-cover" />
                  </div>
                  <h3 className="font-medium text-white">{creator.name}</h3>
                  <p className="text-xs text-gray-400">{creator.role}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass p-8 rounded-xl text-center">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-lg font-medium text-white mb-2">No Creators Yet</h3>
              <p className="text-gray-400">Be the first to share your content!</p>
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-bold text-white mb-2">Latest Job Opportunities</h2>

            {isLoading ? (
              // Loading state
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="glass p-5 rounded-2xl animate-pulse">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-12 h-12 bg-gray-700 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                      </div>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="h-4 bg-gray-700 rounded"></div>
                      <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                    </div>
                    <div className="h-48 bg-gray-700 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              // Error state
              <div className="glass p-8 rounded-2xl text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <h3 className="text-lg font-medium text-white mb-2">Unable to Load Jobs</h3>
                <p className="text-gray-400 mb-4">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : jobs.length > 0 ? (
              // Jobs list
              jobs.map((job) => (
                <div
                  key={job._id || job.id}
                  className="glass p-5 rounded-2xl hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)] transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="flex items-center space-x-3 cursor-pointer"
                      onClick={() => handleProfileClick(job.user?._id || job.user?.id || job.createdBy)}
                      role="button"
                      aria-label={`View ${job.user?.name || 'Employer'}'s profile`}
                    >
                      <img
                        src={job.user?.photo ? `http://localhost:5000${job.user.photo}` : (job.user?.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg')}
                        alt={job.user?.name || 'Employer'}
                        className="w-12 h-12 rounded-full border-2 border-teal-400/50"
                        onError={(e) => {
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(job.user?.name || 'Employer')}&background=1f2937&color=fff`;
                        }}
                      />
                      <div>
                        <h3 className="font-semibold text-white">{job.user?.name || job.user?.firstName + ' ' + job.user?.lastName || 'Employer'}</h3>
                        <p className="text-xs text-gray-400">
                          {job.user?.role || 'Employer'} • {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Recently'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-white mb-2">{job.title}</h3>
                    <p className="text-gray-200 mb-3">{job.description}</p>

                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 rounded-full text-sm">
                        {job.category || 'General'}
                      </span>
                      <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 rounded-full text-sm">
                        ${job.budget || 'TBD'}
                      </span>
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100 rounded-full text-sm">
                        {job.location || 'Remote'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
                    <button className="flex items-center space-x-1 text-gray-400 hover:text-white" aria-label={`View applications (${job.applications?.length || 0})`}>
                      <FiUsers className="w-5 h-5" />
                      <span>{job.applications?.length || 0} applications</span>
                    </button>
                    <button className="flex items-center space-x-1 text-gray-400 hover:text-white" aria-label={`View job details`}>
                      <FiBriefcase className="w-5 h-5" />
                      <span>View Details</span>
                    </button>
                    <button className="flex items-center space-x-1 text-gray-400 hover:text-white" aria-label={`Save job`}>
                      <FiHeart className="w-5 h-5" />
                      <span>Save</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              // No jobs state
              <div className="glass p-8 rounded-2xl text-center">
                <div className="text-4xl mb-4">💼</div>
                <h3 className="text-lg font-medium text-white mb-2">No Jobs Yet</h3>
                <p className="text-gray-400 mb-4">Be the first to post a job opportunity!</p>
                {canPostJobs && (
                  <button
                    onClick={() => navigate('/create-job')}
                    className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full hover:opacity-90 transition-opacity"
                  >
                    <FiBriefcase className="mr-2 inline" /> Post First Job
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Trending Tags */}
            <div className="glass p-5 rounded-2xl">
              <h3 className="font-semibold text-white mb-3">Trending Tags</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  '#marketing',
                  '#photography',
                  '#videography',
                  '#socialmedia',
                  '#branding',
                  '#influencer',
                  '#contentcreation',
                  '#digitalmarketing',
                ].map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-gray-800 text-sm rounded-full text-gray-300 hover:bg-gray-700 cursor-pointer"
                    role="button"
                    aria-label={`Filter by ${tag}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Suggested Connections */}
            <div className="glass p-5 rounded-2xl">
              <h3 className="font-semibold text-white mb-3">Suggested Connections</h3>
              <div className="space-y-4">
                {featuredCreators.slice(0, 4).map((creator) => (
                  <div key={creator.id} className="flex items-center justify-between">
                    <div
                      className="flex items-center space-x-3 cursor-pointer"
                      onClick={() => handleProfileClick(creator.id)}
                      role="button"
                      aria-label={`View ${creator.name}'s profile`}
                    >
                      <img src={creator.avatar} alt={creator.name} className="w-10 h-10 rounded-full" />
                      <div>
                        <h4 className="text-sm font-medium text-white">{creator.name}</h4>
                        <p className="text-xs text-gray-400">{creator.role}</p>
                      </div>
                    </div>
                    <button
                      className="text-xs bg-gradient-to-r from-teal-500 to-blue-600 text-white px-3 py-1 rounded-full hover:opacity-90"
                      aria-label={`Follow ${creator.name}`}
                    >
                      Follow
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={handleCreatePost}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-gradient-to-r from-teal-500 to-blue-600 text-white flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 z-20"
        aria-label="Create new post"
      >
        <FiPlus className="w-6 h-6" />
      </button>
    </div>
  );
}

export default Home;