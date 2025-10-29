import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { postsAPI } from '../services/api';
import { FiImage, FiVideo, FiX, FiSend } from 'react-icons/fi';

const CreatePost = () => {
  const navigate = useNavigate();
  const [postText, setPostText] = useState('');
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [mediaUrl, setMediaUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleMediaUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileType = file.type.split('/')[0];
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];

    if (
      (fileType === 'image' && !validImageTypes.includes(file.type)) ||
      (fileType === 'video' && !validVideoTypes.includes(file.type))
    ) {
      alert('Please upload a supported image (JPEG, PNG, GIF) or video (MP4, WebM, OGG) file');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const uploadResponse = await postsAPI.uploadFile(file);
      if (uploadResponse.success) {
        setMediaType(fileType);
        setMediaUrl(uploadResponse.data.url);

        const previewReader = new FileReader();
        previewReader.onloadend = () => {
          setMediaPreview(previewReader.result);
        };
        previewReader.readAsDataURL(file);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Failed to upload file: ${error.message || 'Please try again.'}`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setIsUploading(false);
    }
  };

  const removeMedia = () => {
    setMediaPreview(null);
    setMediaType(null);
    setMediaUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!postText.trim() && !mediaUrl) {
      alert('Please add some text or media to your post');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        text: postText,
        mediaUrl: mediaUrl || '',
        mediaType: mediaType || '',
      };
      const res = await postsAPI.create(payload);
      console.log('Post created:', res);

      // Show success message
      alert('✅ Post created successfully!');

      // Reset form
      setPostText('');
      removeMedia(); // Reuse removeMedia to avoid duplicating reset logic

      // Navigate to home page
      navigate('/home');
    } catch (error) {
      console.error('Error creating post:', error);
      alert(`Failed to create post: ${error.message || 'Please try again.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Create Post</h1>
          <button
            onClick={() => navigate('/home')}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Cancel post"
          >
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full bg-transparent border-none outline-none resize-none text-gray-200 placeholder-gray-500 min-h-[100px]"
              aria-label="Post content"
            />

            {mediaPreview && (
              <div className="mt-4 relative group">
                {mediaType === 'image' ? (
                  <img
                    src={mediaPreview}
                    alt="Media preview"
                    className="w-full rounded-lg max-h-96 object-cover"
                  />
                ) : (
                  <video
                    src={mediaPreview}
                    controls
                    className="w-full rounded-lg max-h-96"
                    aria-label="Video preview"
                  />
                )}
                <button
                  type="button"
                  onClick={removeMedia}
                  className="absolute top-2 right-2 bg-black/70 rounded-full p-2 hover:bg-black/90 transition-colors"
                  aria-label="Remove media"
                >
                  <FiX size={20} />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <label
                className="p-2 rounded-full hover:bg-gray-800 cursor-pointer transition-colors"
                aria-label="Upload image"
              >
                <FiImage size={24} className="text-green-500" />
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/gif"
                  onChange={handleMediaUpload}
                  className="hidden"
                />
              </label>
              <label
                className="p-2 rounded-full hover:bg-gray-800 cursor-pointer transition-colors"
                aria-label="Upload video"
              >
                <FiVideo size={24} className="text-blue-500" />
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/ogg"
                  onChange={handleMediaUpload}
                  className="hidden"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isUploading || (!postText.trim() && !mediaUrl)}
              className={`px-6 py-2 rounded-full font-medium flex items-center space-x-2 ${
                isSubmitting || isUploading || (!postText.trim() && !mediaUrl)
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-90'
              }`}
            >
              {isUploading ? 'Uploading...' : isSubmitting ? 'Posting...' : 'Post'}
              <FiSend className="ml-2" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePost;