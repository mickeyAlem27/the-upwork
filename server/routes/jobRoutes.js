const express = require('express');
const { protect } = require('../middleware/auth');
const {
  createJob,
  getMyJobs,
  getJobs,
  deactivateJob
} = require('../controllers/jobController');

const router = express.Router();

// Protect routes that modify data (create, update, delete)
router.use(protect); // Enable authentication for all job routes

// Public routes - No authentication required for browsing jobs
router.get('/', getJobs);
router.get('/me', getMyJobs);

// Protected routes - Require authentication for creating/managing jobs
router.post('/', createJob);
router.patch('/:id/deactivate', deactivateJob);

module.exports = router;
