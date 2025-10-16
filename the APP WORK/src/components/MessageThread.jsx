import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiMessageSquare, FiArrowLeft, FiMoreVertical } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { notify } from '../../../server/routes/auth';
notify();


const MessageThread = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [otherUser, setOtherUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        const response = await api.get(`/users/${userId}`);
        setOtherUser(response.data);
      } catch (err) {
        console.error('Error fetching user:', err);
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-4">
        <p className="text-red-400 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!otherUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <p>User not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 p-4 border-b border-gray-700 sticky top-0 z-10">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-gray-700"
          >
            <FiArrowLeft className="text-xl" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Messages</h1>
          </div>
          <button className="p-2 rounded-full hover:bg-gray-700">
            <FiMoreVertical />
          </button>
        </div>
      </header>

      {/* User Info Header - Similar to Home Page */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <img 
              src={otherUser.photo || 'https://randomuser.me/api/portraits/men/1.jpg'} 
              alt={`${otherUser.firstName} ${otherUser.lastName}`}
              className="w-16 h-16 rounded-full object-cover border-2 border-blue-500"
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.firstName + ' ' + otherUser.lastName)}&background=1f2937&color=fff`;
              }}
            />
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-gray-900"></span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">
              {otherUser.firstName} {otherUser.lastName}
            </h2>
            <p className="text-blue-400 text-sm">{otherUser.role}</p>
            {otherUser.bio && (
              <p className="text-gray-300 text-sm mt-1">{otherUser.bio}</p>
            )}
            {otherUser.skills?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {otherUser.skills.map((skill, index) => (
                  <span 
                    key={index} 
                    className="text-xs bg-gray-700 text-gray-200 px-2 py-1 rounded-full"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="p-4 space-y-4">
        <div className="flex justify-center py-8">
          <p className="text-gray-400 text-sm">
            Start of your conversation with {otherUser.firstName}
          </p>
        </div>
        
        {/* Message input */}
        <div className="fixed bottom-0 left-0 right-0 bg-gray-800 p-4 border-t border-gray-700">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Type a message..."
              className="flex-1 bg-gray-700 text-white rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button className="p-2 text-blue-400 hover:text-blue-300">
              <FiMessageSquare size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageThread;
