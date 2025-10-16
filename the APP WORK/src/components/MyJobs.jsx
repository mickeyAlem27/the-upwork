import React, { useState, useEffect } from 'react';
import { FiMapPin, FiClock, FiDollarSign, FiUsers, FiEdit2, FiTrash2, FiPlus, FiBriefcase } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { jobsAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';

const MyJobs = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMyJobs();
    }
  }, [isAuthenticated]);

  const fetchMyJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await jobsAPI.getMyJobs();
      setJobs(response.data || []);
    } catch (err) {
      console.error('Error fetching my jobs:', err);
      setError('Failed to load your jobs. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to deactivate this job?')) {
      return;
    }

    try {
      await jobsAPI.deactivateJob(jobId);
      // Update the job status in the local state
      setJobs(jobs.map(job =>
        job._id === jobId ? { ...job, isActive: false } : job
      ));
    } catch (err) {
      console.error('Error deactivating job:', err);
      setError('Failed to deactivate job. Please try again.');
    }
  };

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
          <p className="text-gray-400">You need to be logged in to manage your jobs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">My Posted Jobs</h1>
            <p className="text-xl text-gray-200 max-w-3xl mx-auto mb-8">
              Manage your job postings and track applications
            </p>
            <button
              onClick={() => navigate('/jobs')}
              className="inline-flex items-center gap-2 bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              <FiPlus />
              Post New Job
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchMyJobs}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Jobs List */}
        {!loading && !error && (
          <>
            {jobs.length === 0 ? (
              <div className="text-center py-12">
                <FiBriefcase size={64} className="mx-auto mb-4 text-gray-600" />
                <h3 className="text-xl font-medium mb-2">No jobs posted yet</h3>
                <p className="text-gray-400 mb-6">
                  Start posting job opportunities to connect with talented professionals
                </p>
                <button
                  onClick={() => navigate('/jobs')}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  <FiPlus />
                  Post Your First Job
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {jobs.map((job) => (
                  <div key={job._id} className={`bg-gray-800 rounded-xl p-6 border ${job.isActive ? 'border-gray-700' : 'border-gray-600 opacity-75'}`}>
                    {/* Job Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{job.title}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEmploymentTypeColor(job.employmentType)}`}>
                            {job.employmentType?.replace('-', ' ') || 'Other'}
                          </span>
                          {!job.isActive && (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
                              Inactive
                            </span>
                          )}
                        </div>
                        {job.company && (
                          <p className="text-green-400 font-medium">{job.company}</p>
                        )}
                      </div>
                    </div>

                    {/* Job Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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

                      <div className="flex items-center text-gray-300">
                        <FiUsers className="mr-2 text-gray-400" />
                        <span className="text-sm">{job.skills?.length || 0} skills required</span>
                      </div>
                    </div>

                    {/* Description */}
                    {job.description && (
                      <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                        {job.description}
                      </p>
                    )}

                    {/* Skills */}
                    {job.skills && job.skills.length > 0 && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-1">
                          {job.skills.slice(0, 5).map((skill, index) => (
                            <span key={index} className="text-xs bg-gray-700 px-2 py-1 rounded">
                              {skill}
                            </span>
                          ))}
                          {job.skills.length > 5 && (
                            <span className="text-xs text-gray-400">+{job.skills.length - 5} more</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                      <div className="text-sm text-gray-400">
                        Status: {job.isActive ? 'Active' : 'Inactive'}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {/* TODO: Edit job functionality */}}
                          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                          disabled={!job.isActive}
                        >
                          <FiEdit2 size={16} />
                          Edit
                        </button>

                        {job.isActive ? (
                          <button
                            onClick={() => handleDeactivateJob(job._id)}
                            className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                          >
                            <FiTrash2 size={16} />
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => {/* TODO: Reactivate job functionality */}}
                            className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                          >
                            <FiPlus size={16} />
                            Reactivate
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Stats */}
        {!loading && !error && jobs.length > 0 && (
          <div className="mt-12 text-center">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="text-2xl font-bold text-green-400">{jobs.length}</div>
                <div className="text-sm text-gray-400">Total Jobs Posted</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="text-2xl font-bold text-blue-400">{jobs.filter(job => job.isActive).length}</div>
                <div className="text-sm text-gray-400">Active Jobs</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="text-2xl font-bold text-gray-400">{jobs.filter(job => !job.isActive).length}</div>
                <div className="text-sm text-gray-400">Inactive Jobs</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyJobs;
