import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMapPin, FiClock, FiDollarSign, FiUsers, FiPlus, FiBriefcase } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { jobsAPI } from '../services/api';

const Jobs = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  // Also fetch jobs when component becomes visible (user navigates back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchJobs();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching jobs from API...');

      const response = await jobsAPI.getJobs();
      console.log('📋 Raw API response:', response);

      // Handle different response formats
      let jobsData = [];
      if (response.data) {
        jobsData = Array.isArray(response.data) ? response.data : response.data.data || [];
      } else if (Array.isArray(response)) {
        jobsData = response;
      }

      console.log('📋 Processed jobs data:', jobsData);
      console.log('📋 Number of jobs:', jobsData.length);

      setJobs(jobsData);
      console.log('✅ Jobs loaded successfully:', jobsData.length);

    } catch (err) {
      console.error('❌ Error fetching jobs:', err);
      console.error('❌ Error details:', {
        message: err.message,
        response: err.response,
        status: err.response?.status,
        data: err.response?.data
      });

      let errorMessage = 'Failed to load jobs. Please try again later.';
      if (err.response?.status === 404) {
        errorMessage = 'Jobs endpoint not found. Please check if the server is running.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error. Please check if the backend server is running properly.';
      } else if (err.code === 'ERR_NETWORK') {
        errorMessage = 'Cannot connect to server. Please check if the backend server is running on port 5000.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isPromoter = user?.role === 'promoter';
  const isBrand = user?.role === 'brand';
  const canPostJobs = isPromoter;

  const filteredJobs = jobs.filter(job => {
    // If no search term and no filter, show all jobs
    if (!searchTerm && filterType === 'all') {
      return true;
    }

    const matchesSearch = !searchTerm || (
      job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const matchesType = filterType === 'all' || job.employmentType === filterType;

    return matchesSearch && matchesType;
  });

  const formatSalary = (min, max) => {
    if (!min && !max) return 'Salary not specified';
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    if (min) return `From $${min.toLocaleString()}`;
    return `Up to $${max.toLocaleString()}`;
  };

  const getEmploymentTypeColor = (type) => {
    const colors = {
      'full-time': 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
      'part-time': 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100',
      'contract': 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100',
      'internship': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
      'temporary': 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100',
      'other': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
    };
    return colors[type] || colors.other;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <FiBriefcase size={64} className="mx-auto mb-4 text-gray-600" />
          <h2 className="text-2xl font-bold mb-2">Please Sign In</h2>
          <p className="text-gray-400">You need to be logged in to view job opportunities.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Job Opportunities</h1>
              <p className="text-lg text-gray-200">
                Discover exciting opportunities in the promotion industry
              </p>
            </div>
            {canPostJobs && (
              <button
                onClick={() => navigate('/create-job')}
                className="mt-4 sm:mt-0 inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                <FiPlus />
                Post New Job
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Jobs Grid */}
        {!loading && !error && jobs.length > 0 && (
          <>
            {filteredJobs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredJobs.map((job) => (
                  <div key={job._id} className="bg-gray-800 rounded-xl p-6 hover:bg-gray-750 transition-colors border border-gray-700">
                    {/* Job Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-1">{job.title}</h3>
                        {job.company && (
                          <p className="text-blue-400 font-medium">{job.company}</p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEmploymentTypeColor(job.employmentType)}`}>
                        {job.employmentType?.replace('-', ' ') || 'Other'}
                      </span>
                    </div>

                    {/* Job Details */}
                    <div className="space-y-3 mb-4">
                      {job.location && (
                        <div className="flex items-center text-gray-300">
                          <FiMapPin className="mr-2 text-gray-400" />
                          <span className="text-sm">{job.location}</span>
                        </div>
                      )}

                      <div className="flex items-center text-gray-300">
                        <FiDollarSign className="mr-2 text-gray-400" />
                        <span className="text-sm">{formatSalary(job.salaryMin, job.salaryMax)}</span>
                      </div>

                      <div className="flex items-center text-gray-300">
                        <FiClock className="mr-2 text-gray-400" />
                        <span className="text-sm">Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                      </div>

                      {job.skills && job.skills.length > 0 && (
                        <div className="flex items-start text-gray-300">
                          <FiUsers className="mr-2 mt-0.5 text-gray-400" />
                          <div className="flex flex-wrap gap-1">
                            {job.skills.slice(0, 3).map((skill, index) => (
                              <span key={index} className="text-xs bg-gray-700 px-2 py-1 rounded">
                                {skill}
                              </span>
                            ))}
                            {job.skills.length > 3 && (
                              <span className="text-xs text-gray-400">+{job.skills.length - 3} more</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Description Preview */}
                    {job.description && (
                      <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                        {job.description}
                      </p>
                    )}

                    {/* Promoter Info */}
                    {job.postedBy && (
                      <div className="border-t border-gray-700 pt-4 mb-4">
                        <div className="flex items-center">
                          <div className="relative mr-3">
                            {job.postedBy.photo ? (
                              <img
                                src={`http://localhost:5000${job.postedBy.photo}`}
                                alt={`${job.postedBy.firstName} ${job.postedBy.lastName}`}
                                className="w-8 h-8 rounded-full object-cover border-2 border-gray-600"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div
                              className={`w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm ${
                                job.postedBy.photo ? 'hidden' : 'flex'
                              }`}
                              style={{
                                background: job.postedBy.photo ? 'transparent' : undefined,
                                display: job.postedBy.photo ? 'none' : 'flex'
                              }}
                            >
                              {job.postedBy.firstName?.charAt(0)}{job.postedBy.lastName?.charAt(0)}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">
                              Posted by {job.postedBy.firstName} {job.postedBy.lastName}
                            </p>
                            <p className="text-xs text-gray-400">{job.postedBy.role}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Apply Button */}
                    <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2 px-4 rounded-lg font-medium transition-all duration-200 transform hover:scale-105">
                      View Details & Apply
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchJobs}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
        {/* Empty State */}
        {!loading && !error && jobs.length === 0 && (
          <div className="text-center py-12">
            <FiBriefcase size={64} className="mx-auto mb-4 text-gray-600" />
            <h3 className="text-xl font-medium mb-2">No jobs found</h3>
            <p className="text-gray-400">
              No job opportunities available at the moment
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Jobs;
