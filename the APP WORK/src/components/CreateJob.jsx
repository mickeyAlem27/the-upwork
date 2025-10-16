import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { jobsAPI } from '../services/api';
import { FiBriefcase, FiMapPin, FiDollarSign, FiUsers, FiFileText, FiX, FiSend, FiHome, FiMail } from 'react-icons/fi';

const CreateJob = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    company: '',
    location: '',
    employmentType: 'full-time',
    salaryMin: '',
    salaryMax: '',
    skills: [],
    applicationDeadline: '',
    jobCategory: '',
    experienceLevel: 'entry',
    workArrangement: 'on-site',
    requirements: [],
    benefits: [],
    contactEmail: '',
    applicationUrl: ''
  });

  const employmentTypes = [
    'full-time',
    'part-time',
    'contract',
    'internship',
    'temporary',
    'other'
  ];

  const experienceLevels = ['entry', 'mid', 'senior', 'executive'];
  const workArrangements = ['on-site', 'remote', 'hybrid'];

  const handleArrayFieldChange = (field, value) => {
    const items = value.split(',').map(item => item.trim()).filter(item => item !== '');
    setFormData(prev => ({
      ...prev,
      [field]: items
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSkillsChange = (e) => {
    const skills = e.target.value.split(',').map(skill => skill.trim()).filter(skill => skill !== '');
    setFormData(prev => ({
      ...prev,
      skills
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('🚀 Posting job with data:', {
        title: formData.title.trim(),
        description: formData.description.trim(),
        company: formData.company.trim(),
        location: formData.location.trim(),
        employmentType: formData.employmentType,
        salaryMin: formData.salaryMin ? parseInt(formData.salaryMin) : null,
        salaryMax: formData.salaryMax ? parseInt(formData.salaryMax) : null,
        skills: formData.skills
      });

      const response = await jobsAPI.createJob({
        title: formData.title.trim(),
        description: formData.description.trim(),
        company: formData.company.trim(),
        location: formData.location.trim(),
        employmentType: formData.employmentType,
        salaryMin: formData.salaryMin ? parseInt(formData.salaryMin) : null,
        salaryMax: formData.salaryMax ? parseInt(formData.salaryMax) : null,
        skills: formData.skills,
        applicationDeadline: formData.applicationDeadline || null,
        jobCategory: formData.jobCategory.trim() || null,
        experienceLevel: formData.experienceLevel,
        workArrangement: formData.workArrangement,
        requirements: formData.requirements,
        benefits: formData.benefits,
        contactEmail: formData.contactEmail.trim() || null,
        applicationUrl: formData.applicationUrl.trim() || null
      });

      console.log('✅ Job posted successfully:', response);
      alert('Job posted successfully!');

      // Reset form after successful submission
      setFormData({
        title: '',
        description: '',
        company: '',
        location: '',
        employmentType: 'full-time',
        salaryMin: '',
        salaryMax: '',
        skills: [],
        applicationDeadline: '',
        jobCategory: '',
        experienceLevel: 'entry',
        workArrangement: 'on-site',
        requirements: [],
        benefits: [],
        contactEmail: '',
        applicationUrl: ''
      });

      navigate('/my-jobs');
    } catch (error) {
      console.error('❌ Error creating job:', error);
      alert(`Failed to post job: ${error.message || 'Please try again.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatSalary = (min, max) => {
    if (!min && !max) return 'Salary not specified';
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    if (min) return `From $${min.toLocaleString()}`;
    return `Up to $${max.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Post a Job</h1>
            <p className="text-gray-400">Create a job opportunity for talented professionals</p>
          </div>
          <button
            onClick={() => navigate('/home')}
            className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
            aria-label="Cancel and go back"
          >
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Job Details Section */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <FiBriefcase className="mr-3 text-blue-500" />
              Job Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Job Title */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Job Title *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. Social Media Manager, Content Creator"
                />
              </div>

              {/* Company */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Company
                </label>
                <div className="relative">
                  <FiHome className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 text-white pl-10 pr-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Company name"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Location
                </label>
                <div className="relative">
                  <FiMapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 text-white pl-10 pr-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="City, State or Remote"
                  />
                </div>
              </div>

              {/* Employment Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Employment Type
                </label>
                <select
                  name="employmentType"
                  value={formData.employmentType}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {employmentTypes.map(type => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Salary Section */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <FiDollarSign className="mr-3 text-green-500" />
              Salary Range (Optional)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Minimum Salary ($)
                </label>
                <input
                  type="number"
                  name="salaryMin"
                  value={formData.salaryMin}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="50000"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Maximum Salary ($)
                </label>
                <input
                  type="number"
                  name="salaryMax"
                  value={formData.salaryMax}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="80000"
                  min="0"
                />
              </div>
            </div>

            {formData.salaryMin && formData.salaryMax && (
              <div className="mt-4 p-3 bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-300">
                  Salary Range: <span className="text-green-400 font-medium">
                    {formatSalary(parseInt(formData.salaryMin), parseInt(formData.salaryMax))}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Additional Details Section */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <FiUsers className="mr-3 text-purple-500" />
              Additional Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Job Category */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Job Category
                </label>
                <input
                  type="text"
                  name="jobCategory"
                  value={formData.jobCategory}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g. Marketing, Design, Sales"
                />
              </div>

              {/* Experience Level */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Experience Level
                </label>
                <select
                  name="experienceLevel"
                  value={formData.experienceLevel}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {experienceLevels.map(level => (
                    <option key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Work Arrangement */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Work Arrangement
                </label>
                <select
                  name="workArrangement"
                  value={formData.workArrangement}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {workArrangements.map(arrangement => (
                    <option key={arrangement} value={arrangement}>
                      {arrangement.charAt(0).toUpperCase() + arrangement.slice(1).replace('-', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Application Deadline */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Application Deadline
                </label>
                <input
                  type="date"
                  name="applicationDeadline"
                  value={formData.applicationDeadline}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Requirements & Benefits Section */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <FiFileText className="mr-3 text-orange-500" />
              Requirements & Benefits
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Requirements */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Requirements (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.requirements.join(', ')}
                  onChange={(e) => handleArrayFieldChange('requirements', e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Bachelor's degree, 2+ years experience, Photoshop skills"
                />
                {formData.requirements.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-300 mb-1">Requirements:</p>
                    <div className="flex flex-wrap gap-1">
                      {formData.requirements.map((req, index) => (
                        <span key={index} className="text-xs bg-orange-600 text-white px-2 py-1 rounded">
                          {req}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Benefits */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Benefits (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.benefits.join(', ')}
                  onChange={(e) => handleArrayFieldChange('benefits', e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Health insurance, Flexible hours, Remote work"
                />
                {formData.benefits.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-300 mb-1">Benefits:</p>
                    <div className="flex flex-wrap gap-1">
                      {formData.benefits.map((benefit, index) => (
                        <span key={index} className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                          {benefit}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <FiMail className="mr-3 text-blue-500" />
              Contact Information (Optional)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Email */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Contact Email
                </label>
                <input
                  type="email"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="jobs@company.com"
                />
              </div>

              {/* Application URL */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Application URL
                </label>
                <input
                  type="url"
                  name="applicationUrl"
                  value={formData.applicationUrl}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://company.com/apply"
                />
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <FiFileText className="mr-3 text-orange-500" />
              Job Description *
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Detailed Description
              </label>
              <textarea
                name="description"
                required
                rows={8}
                value={formData.description}
                onChange={handleInputChange}
                className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-vertical"
                placeholder="Describe the job responsibilities, requirements, benefits, and what you're looking for in a candidate..."
              />
              <p className="text-sm text-gray-400 mt-2">
                Provide detailed information about the role, responsibilities, and requirements
              </p>
            </div>
          </div>

          {/* Submit Section */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-700">
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !formData.title.trim() || !formData.description.trim()}
              className={`px-8 py-3 rounded-lg font-medium flex items-center space-x-2 transition-all duration-200 ${
                isSubmitting || !formData.title.trim() || !formData.description.trim()
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transform hover:scale-105'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  <span>Posting...</span>
                </>
              ) : (
                <>
                  <span>Post Job</span>
                  <FiSend className="ml-2" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateJob;
