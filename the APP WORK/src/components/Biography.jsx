import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { postsAPI } from '../services/api';
import {
  FiEdit3,
  FiSave,
  FiX,
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiBriefcase,
  FiAward,
  FiBook,
  FiLock,
  FiEye,
  FiEyeOff,
  FiCheck,
  FiAlertCircle,
} from 'react-icons/fi';

const Biography = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Form state for profile editing
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    company: '',
    jobTitle: '',
    bio: '',
    skills: [],
    photo: null,
    photoPreview: null
  });

  // Form state for password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const fileInputRef = useRef(null);

  // Initialize form data when user data is available
  useEffect(() => {
    if (user && typeof user === 'object') {
      // Only update if user data actually changed to prevent unnecessary re-renders
      setProfileData(prev => {
        const newPhotoPreview = user.photo
          ? (user.photo.startsWith('http') ? user.photo : `http://localhost:5000${user.photo}`)
          : null;

        // Check if anything actually changed
        if (
          prev.firstName !== user.firstName ||
          prev.lastName !== user.lastName ||
          prev.email !== user.email ||
          prev.phone !== user.phone ||
          prev.location !== user.location ||
          prev.company !== user.company ||
          prev.jobTitle !== user.jobTitle ||
          prev.bio !== user.bio ||
          JSON.stringify(prev.skills) !== JSON.stringify(user.skills || []) ||
          prev.photoPreview !== newPhotoPreview
        ) {
          return {
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email || '',
            phone: user.phone || '',
            location: user.location || '',
            company: user.company || '',
            jobTitle: user.jobTitle || '',
            bio: user.bio || '',
            skills: Array.isArray(user.skills) ? user.skills : [],
            photo: null,
            photoPreview: newPhotoPreview
          };
        }
        return prev;
      });
    }
  }, [user]);

  const handleProfileChange = useCallback((e) => {
    const { name, value, files } = e.target;

    if (files && files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData(prev => ({
          ...prev,
          [name]: files[0],
          photoPreview: reader.result
        }));
      };
      reader.readAsDataURL(files[0]);
    } else {
      setProfileData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  }, []);

  const handleSkillsChange = useCallback((e) => {
    const value = e.target.value;
    setProfileData(prev => ({
      ...prev,
      skills: value.split(',').map(skill => skill.trim()).filter(skill => skill !== '')
    }));
  }, []);

  const handlePasswordChange = useCallback((e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const updateProfile = async () => {
    try {
      setIsLoading(true);
      setMessage({ type: '', text: '' });

      let photoUrl = null;

      // If there's a new photo selected, upload it first
      if (profileData.photo && profileData.photo instanceof File) {
        try {
          const uploadResponse = await postsAPI.uploadFile(profileData.photo);
          if (uploadResponse.data && uploadResponse.data.url) {
            photoUrl = uploadResponse.data.url;
          }
        } catch (uploadError) {
          console.error('Photo upload failed:', uploadError);
          setMessage({ type: 'error', text: 'Failed to upload photo. Please try again.' });
          return;
        }
      }

      // Prepare update data (only include changed fields)
      const updateData = {};
      Object.keys(profileData).forEach(key => {
        const currentValue = profileData[key];
        const originalValue = user[key];

        // Handle photo field specially
        if (key === 'photo') {
          if (photoUrl) {
            updateData[key] = photoUrl;
          } else if (currentValue !== originalValue && currentValue !== null) {
            updateData[key] = currentValue;
          }
        } else if (currentValue !== originalValue) {
          updateData[key] = currentValue;
        }
      });

      console.log('🔄 Profile Update Debug:');
      console.log('User data:', user);
      console.log('Profile data:', profileData);
      console.log('Update data:', updateData);
      console.log('Is updateData empty?', Object.keys(updateData).length === 0);

      // Don't make API call if no changes
      if (Object.keys(updateData).length === 0) {
        setMessage({ type: 'info', text: 'No changes to save.' });
        setIsEditing(false);
        return;
      }

      // Check if user is authenticated
      if (!user || !user._id) {
        setMessage({ type: 'error', text: 'Please log in to update your profile.' });
        return;
      }

      const response = await api.put('/auth/profile', updateData);
      console.log('🔄 API Response:', response);
      console.log('🔄 Response Data:', response.data);
      console.log('🔄 Response Status:', response.status);

      if (response.data.success && response.data.data) {
        // Update local auth context
        updateUser(response.data.data);

        // Show appropriate message based on demo mode
        const isDemo = response.data.demo;
        setMessage({
          type: 'success',
          text: isDemo
            ? 'Profile updated in demo mode (changes not saved to database)'
            : 'Profile updated successfully!'
        });

        // Update local form data to reflect changes without full re-initialization
        setProfileData(prev => ({
          ...prev,
          ...response.data.data,
          photo: null, // Reset photo field since we don't need it anymore
          photoPreview: response.data.data.photo ? `http://localhost:5000${response.data.data.photo}` : prev.photoPreview
        }));

        // Show success message for 2 seconds before exiting edit mode
        setTimeout(() => {
          setIsEditing(false);
        }, 2000);
      } else {
        console.error('❌ API Response failed validation:', {
          success: response.data.success,
          hasUser: !!response.data.data,
          responseData: response.data
        });
        setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
      }
    } catch (error) {
      console.error('❌ Profile Update Error Details:');
      console.error('Error message:', error.message);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);

      if (error.response?.status === 401) {
        setMessage({ type: 'error', text: 'Authentication failed. Please log in again.' });
        // Optionally redirect to login
        // window.location.href = '/login';
      } else if (error.response?.status === 503) {
        setMessage({ type: 'error', text: 'Database unavailable. Please try again later.' });
      } else {
        setMessage({
          type: 'error',
          text: error.response?.data?.message || 'Failed to update profile. Please try again.'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async () => {
    try {
      setIsLoading(true);
      setMessage({ type: '', text: '' });

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setMessage({ type: 'error', text: 'New passwords do not match!' });
        return;
      }

      if (passwordData.newPassword.length < 6) {
        setMessage({ type: 'error', text: 'Password must be at least 6 characters long!' });
        return;
      }

      const response = await api.put('/auth/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (response.data.success) {
        // Show appropriate message based on demo mode
        const isDemo = response.data.demo;
        setMessage({
          type: 'success',
          text: isDemo
            ? 'Password changed in demo mode (not actually saved)'
            : 'Password changed successfully!'
        });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setIsChangingPassword(false);
      }
    } catch (error) {
      console.error('Password change error:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to change password. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const cancelEdit = useCallback(() => {
    // Reset form data to original user data only if currently editing
    if (isEditing && user && typeof user === 'object') {
      const newPhotoPreview = user.photo
        ? (user.photo.startsWith('http') ? user.photo : `http://localhost:5000${user.photo}`)
        : null;

      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        location: user.location || '',
        company: user.company || '',
        jobTitle: user.jobTitle || '',
        bio: user.bio || '',
        skills: Array.isArray(user.skills) ? user.skills : [],
        photo: null,
        photoPreview: newPhotoPreview
      });
    }
    setIsEditing(false);
    setMessage({ type: '', text: '' });
  }, [isEditing, user]);

  const displayName = useMemo(() =>
    user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User' : 'User',
    [user?.firstName, user?.lastName]
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header with Edit Button */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
            {!isEditing && !isChangingPassword && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FiEdit3 className="mr-2" />
                Edit Profile
              </button>
            )}
          </div>

          {/* Status Messages */}
          {message.text && (
            <div className={`mb-4 p-3 rounded-lg flex items-center ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
              {message.type === 'success' ? <FiCheck className="mr-2" /> : <FiAlertCircle className="mr-2" />}
              {message.text}
            </div>
          )}

          {/* Profile Photo Section */}
          <div className="flex flex-col md:flex-row items-center mb-6">
            <div className="relative w-32 h-32 mb-4 md:mb-0 md:mr-8">
              {isEditing && profileData.photoPreview ? (
                <img
                  src={profileData.photoPreview}
                  alt="Profile preview"
                  className="w-full h-full rounded-full object-cover border-4 border-blue-500"
                />
              ) : (
                <img
                  src={
                    user?.photo
                      ? (user.photo.startsWith('http') ? user.photo : `http://localhost:5000${user.photo}`)
                      : 'https://randomuser.me/api/portraits/lego/1.jpg'
                  }
                  alt={displayName}
                  className="w-full h-full rounded-full object-cover border-4 border-gray-200"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1f2937&color=fff&size=200`;
                  }}
                />
              )}
              {isEditing && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 hover:bg-blue-700 transition-colors"
                >
                  <FiUser className="w-5 h-5" />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                name="photo"
                onChange={handleProfileChange}
                className="hidden"
                accept="image/*"
              />
            </div>
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-bold text-gray-900">{displayName || 'User'}</h2>
              <p className="text-gray-600">{user?.role || 'User'}</p>
              <p className="text-sm text-gray-500">
                Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Profile Information Form */}
          {isEditing ? (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={profileData.firstName}
                    onChange={handleProfileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={profileData.lastName}
                    onChange={handleProfileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={profileData.email}
                    onChange={handleProfileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={profileData.phone}
                    onChange={handleProfileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <input
                    type="text"
                    name="location"
                    value={profileData.location}
                    onChange={handleProfileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                  <input
                    type="text"
                    name="jobTitle"
                    value={profileData.jobTitle}
                    onChange={handleProfileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                <input
                  type="text"
                  name="company"
                  value={profileData.company}
                  onChange={handleProfileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                <textarea
                  name="bio"
                  value={profileData.bio}
                  onChange={handleProfileChange}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Skills (comma separated)</label>
                <input
                  type="text"
                  value={profileData.skills.join(', ')}
                  onChange={handleSkillsChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="JavaScript, React, Node.js, etc."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FiX className="mr-2 inline" />
                  Cancel
                </button>
                <button
                  onClick={updateProfile}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2 inline-block"></div>
                  ) : (
                    <FiSave className="mr-2 inline" />
                  )}
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            /* Display Mode */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center">
                  <FiMail className="mr-3 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{user?.email || 'Not provided'}</p>
                  </div>
                </div>
                {user?.phone && (
                  <div className="flex items-center">
                    <FiPhone className="mr-3 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium">{user.phone}</p>
                    </div>
                  </div>
                )}
                {user?.location && (
                  <div className="flex items-center">
                    <FiMapPin className="mr-3 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-medium">{user.location}</p>
                    </div>
                  </div>
                )}
                {user?.jobTitle && (
                  <div className="flex items-center">
                    <FiBriefcase className="mr-3 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Job Title</p>
                      <p className="font-medium">{user.jobTitle}</p>
                    </div>
                  </div>
                )}
                {user?.company && (
                  <div className="flex items-center">
                    <FiBriefcase className="mr-3 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Company</p>
                      <p className="font-medium">{user.company}</p>
                    </div>
                  </div>
                )}
              </div>

              {user?.bio && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">About</h3>
                  <p className="text-gray-700">{user.bio}</p>
                </div>
              )}

              {user?.skills && user.skills.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {user.skills.map((skill, idx) => (
                      <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Password Change Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Change Password</h2>
            {!isChangingPassword && (
              <button
                onClick={() => setIsChangingPassword(true)}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <FiLock className="mr-2" />
                Change Password
              </button>
            )}
          </div>

          {isChangingPassword ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setIsChangingPassword(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    setMessage({ type: '', text: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FiX className="mr-2 inline" />
                  Cancel
                </button>
                <button
                  onClick={changePassword}
                  disabled={isLoading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2 inline-block"></div>
                  ) : (
                    <FiLock className="mr-2 inline" />
                  )}
                  {isLoading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">Keep your account secure by updating your password regularly.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(Biography);