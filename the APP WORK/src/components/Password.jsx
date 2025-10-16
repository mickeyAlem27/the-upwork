import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiArrowLeft, FiMail, FiLock, FiCheck, FiArrowRight } from 'react-icons/fi';

// Mock API functions
const sendOtp = async (email) => ({ success: true });
const verifyOtp = async (otp) => ({ success: otp === '123456' });

const Password = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(0);
  const [flow, setFlow] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [resendTimer, setResendTimer] = useState(0);

  const handleFlowSelect = (selectedFlow) => {
    setFlow(selectedFlow);
    setStep(1);
    setMessage({ text: '', type: '' });
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else if (step === 1) {
      setFlow(null);
      setStep(0);
    } else navigate(-1);
    setMessage({ text: '', type: '' });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!formData.email) {
      setMessage({ text: 'Please enter your email', type: 'error' });
      return;
    }
    setIsLoading(true);
    try {
      await sendOtp(formData.email);
      setStep(2);
      setResendTimer(30);
      setMessage({ text: 'OTP sent to your email', type: 'success' });
    } catch (error) {
      setMessage({ text: 'Failed to send OTP', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!formData.otp) {
      setMessage({ text: 'Please enter the OTP', type: 'error' });
      return;
    }
    setIsLoading(true);
    try {
      const { success } = await verifyOtp(formData.otp);
      if (success) {
        setStep(3);
        setMessage({ text: 'OTP verified', type: 'success' });
      } else {
        setMessage({ text: 'Invalid OTP', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Error verifying OTP', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({ text: "Passwords don't match!", type: 'error' });
      return;
    }
    if (formData.newPassword.length < 8) {
      setMessage({ text: 'Password must be at least 8 characters', type: 'error' });
      return;
    }
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMessage({ 
        text: `Password ${flow === 'change' ? 'changed' : 'reset'} successfully!`,
        type: 'success' 
      });
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      setMessage({ text: 'Failed to update password', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = resendTimer > 0 ? setTimeout(() => setResendTimer(resendTimer - 1), 1000) : null;
    return () => timer && clearTimeout(timer);
  }, [resendTimer]);

  const renderStep = () => {
    if (step === 0) {
      return (
        <div className="space-y-4">
          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-3">Change Password</h3>
            <p className="text-gray-400 text-sm mb-4">I know my current password</p>
            <button
              onClick={() => handleFlowSelect('change')}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center"
            >
              Continue
              <FiArrowRight className="ml-2" />
            </button>
          </div>
          
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-400">OR</span>
            </div>
          </div>
          
          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-3">Reset Password</h3>
            <p className="text-gray-400 text-sm mb-4">I forgot my password</p>
            <button
              onClick={() => handleFlowSelect('reset')}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center"
            >
              Reset Password
              <FiArrowRight className="ml-2" />
            </button>
          </div>
        </div>
      );
    }

    if (flow === 'reset') {
      if (step === 1) {
        return (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-2 px-4 rounded-lg transition-colors"
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        );
      }

      if (step === 2) {
        return (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Enter OTP
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={resendTimer > 0 || isLoading}
                  className="ml-2 text-xs text-cyan-400 hover:text-teal-400 disabled:text-gray-500"
                >
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                </button>
              </label>
              <input
                type="text"
                name="otp"
                value={formData.otp}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="_ _ _ _ _ _"
                maxLength={6}
                required
              />
              <p className="mt-1 text-xs text-gray-400">Enter the 6-digit code sent to {formData.email}</p>
            </div>
            <button
              type="submit"
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-2 px-4 rounded-lg transition-colors"
              disabled={isLoading}
            >
              {isLoading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>
        );
      }
    }

    // Password update form (for both flows)
    return (
      <form onSubmit={handlePasswordReset} className="space-y-4">
        {flow === 'change' && step === 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Current Password</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Enter current password"
                required
              />
            </div>
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            {flow === 'reset' ? 'New Password' : 'Create New Password'}
          </label>
          <div className="relative">
            <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              className="w-full pl-10 pr-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Enter new password"
              required
              minLength={8}
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            {flow === 'reset' ? 'Confirm New Password' : 'Confirm Password'}
          </label>
          <div className="relative">
            <FiCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full pl-10 pr-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Confirm your new password"
              required
              minLength={8}
            />
          </div>
        </div>
        
        <button
          type="submit"
          className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-2 px-4 rounded-lg transition-colors"
          disabled={isLoading || message.type === 'success'}
        >
          {isLoading ? 'Updating...' : message.type === 'success' ? 'Password Updated!' : 'Update Password'}
        </button>
      </form>
    );
  };

  const getStepTitle = () => {
    if (step === 0) return 'Password Options';
    if (flow === 'reset') {
      if (step === 1) return 'Reset Password';
      if (step === 2) return 'Verify OTP';
      return 'Create New Password';
    }
    return step === 1 ? 'Change Password' : 'Create New Password';
  };

  const getStepDescription = () => {
    if (step === 0) return 'Please select an option to continue';
    if (flow === 'reset') {
      if (step === 1) return 'Enter your email to receive a verification code';
      if (step === 2) return `Enter the 6-digit code sent to ${formData.email}`;
      return 'Create a new password for your account';
    }
    return step === 1 ? 'Enter your current password' : 'Create a new password for your account';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-900">
      <div className="max-w-md w-full p-8 bg-gray-800 rounded-xl shadow-lg">
        <button
          onClick={handleBack}
          className="flex items-center text-cyan-400 hover:text-teal-400 mb-4 transition-colors"
        >
          <FiArrowLeft className="mr-1" /> {step === 0 ? 'Back to Login' : 'Back'}
        </button>
        
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">{getStepTitle()}</h1>
          <p className="text-gray-300">{getStepDescription()}</p>
        </div>

        {message.text && (
          <div 
            className={`mb-4 p-3 rounded-md text-sm ${
              message.type === 'success' 
                ? 'bg-green-500/20 text-green-300' 
                : 'bg-red-500/20 text-red-300'
            }`}
          >
            {message.text}
          </div>
        )}

        {renderStep()}
      </div>
    </div>
  );
};

export default Password;
