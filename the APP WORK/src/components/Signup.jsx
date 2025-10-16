import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import assets from '../assets/assets.js';
import { authAPI } from '../services/api';

function Signup() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    skills: [],
    bio: '',
    photo: null,
    photoPreview: null
  });
  
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    
    if (files && files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          [name]: files[0],
          photoPreview: reader.result
        }));
      };
      reader.readAsDataURL(files[0]);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSkillsChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      skills: value.split(',').map(skill => skill.trim())
    }));
  };

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    // Ensure role is set to a valid value
    const validRoles = ['user', 'promoter', 'brand'];
    const userRole = validRoles.includes(formData.role) ? formData.role : 'user';

    const userData = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      role: userRole,
      skills: formData.skills.filter(skill => skill.trim() !== ''),
      bio: formData.bio.trim(),
      // photo: formData.photo // Uncomment when file upload is implemented
    };
    
    console.log('Sending registration data:', userData); // Debug log

    try {
      setIsSubmitting(true);
      setError('');
      
      const response = await authAPI.register(userData);
      
      if (response.success) {
        navigate("/login");
      }
    } catch (error) {
      console.error('Registration error:', error);
      // Handle different types of errors
      if (typeof error === 'string') {
        setError(error);
      } else if (error.message) {
        setError(error.message);
      } else if (error.response?.data) {
        // Handle validation errors from the server
        if (error.response.data.errors) {
          const errorMessages = Object.values(error.response.data.errors)
            .map(err => err.msg || err)
            .join('\n');
          setError(errorMessages || 'Validation failed. Please check your input.');
        } else {
          setError(error.response.data.message || 'Registration failed. Please try again.');
        }
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercentage = (step / 3) * 100;

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <video autoPlay loop muted className="absolute inset-0 w-full h-full object-cover z-0">
        <source src={assets.smoke} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black bg-opacity-60"></div>
      
      <div className="glass rounded-2xl p-5 sm:p-6 w-full max-w-sm z-10 shadow-2xl animate-fade-in">
        <div className="text-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold gradient-text mb-1">Create Account</h1>
          <p className="text-gray-400 text-xs sm:text-sm">Step {step} of 3</p>
        </div>
        
        <div className="w-full bg-gray-700 rounded-full h-1.5 mb-6">
          <div
            className="bg-gradient-to-r from-teal-400 to-primary h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        
        {/* Step 1: Basic Information */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="form-group">
                <label className="form-label text-xs sm:text-sm">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="form-input w-full text-sm"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label text-xs sm:text-sm">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="form-input w-full text-sm"
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label text-xs sm:text-sm">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input w-full text-sm"
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label text-xs sm:text-sm">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-input w-full text-sm"
                required
                minLength={6}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label text-xs sm:text-sm">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="form-input w-full text-sm"
                required
                minLength={6}
              />
            </div>
            
            <div className="pt-2">
              <button
                onClick={handleNext}
                className="w-full gradient-btn hover:shadow-lg transform hover:scale-[1.02] active:scale-95 transition-all duration-300 py-2.5 text-sm"
                disabled={!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.confirmPassword}
              >
                Continue
              </button>
            </div>
            
            <p className="text-center text-xs text-gray-400 mt-2">
              Already have an account?{' '}
              <Link to="/login" className="text-teal-400 hover:text-teal-300 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        )}
        
        {/* Step 2: Role and Skills */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="form-group">
              <label className="form-label text-xs sm:text-sm">Role</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="form-input w-full text-sm"
                required
              >
                <option value="">Select your role</option>
                <option value="promoter">Promoter</option>
                <option value="brand">Brand</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label text-xs sm:text-sm">Skills (comma separated)</label>
              <input
                type="text"
                name="skills"
                value={formData.skills.join(', ')}
                onChange={handleSkillsChange}
                className="form-input w-full text-sm"
                placeholder="e.g., JavaScript, React, UI/UX"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label text-xs sm:text-sm">Bio</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows="3"
                className="form-input w-full text-sm"
                placeholder="Tell us about yourself..."
              ></textarea>
            </div>
            
            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="gradient-btn hover:shadow-lg transform hover:scale-[1.02] active:scale-95 transition-all duration-300 py-2 px-6 text-sm"
                disabled={!formData.role}
              >
                Continue
              </button>
            </div>
          </div>
        )}
        
        {/* Step 3: Profile Photo and Submit */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex flex-col items-center">
              <div className="relative w-24 h-24 mb-4 rounded-full overflow-hidden border-2 border-teal-400">
                {formData.photoPreview ? (
                  <img 
                    src={formData.photoPreview} 
                    alt="Profile preview" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
                <label className="absolute bottom-0 right-0 bg-teal-500 text-white rounded-full p-1.5 cursor-pointer hover:bg-teal-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input
                    type="file"
                    name="photo"
                    onChange={handleChange}
                    className="hidden"
                    accept="image/*"
                  />
                </label>
              </div>
              <p className="text-xs text-gray-400 text-center mb-4">
                Click the camera icon to upload a profile photo (optional)
              </p>
            </div>
            
            {error && (
              <div className="text-red-400 text-sm text-center mb-2">
                {error}
              </div>
            )}
            
            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className={`px-4 py-2 text-sm ${isSubmitting ? 'text-gray-500' : 'text-gray-300 hover:text-white'} transition-colors`}
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`px-6 py-2 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-full ${
                  isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'
                } transition-opacity flex items-center`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Account...
                  </>
                ) : 'Complete Sign Up'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Signup;
