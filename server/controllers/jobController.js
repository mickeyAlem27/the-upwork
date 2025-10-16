const Job = require('../models/Job');
const ErrorResponse = require('../utils/errorResponse');

// Create a new job
exports.createJob = async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      return next(new ErrorResponse('Authentication required to create jobs', 401));
    }

    const {
      title,
      description,
      company,
      location,
      employmentType,
      salaryMin,
      salaryMax,
      skills,
      applicationDeadline,
      jobCategory,
      experienceLevel,
      workArrangement,
      requirements,
      benefits,
      contactEmail,
      applicationUrl
    } = req.body;

    if (!title || !description) {
      return next(new ErrorResponse('Title and description are required', 400));
    }

    // Validate salary range if provided
    if (salaryMin && salaryMax && salaryMin > salaryMax) {
      return next(new ErrorResponse('Minimum salary cannot be greater than maximum salary', 400));
    }

    // Check if user is promoter or brand
    if (req.user.role !== 'promoter' && req.user.role !== 'brand') {
      return next(new ErrorResponse('Only promoters and brands can post jobs', 403));
    }

    const job = await Job.create({
      title: title.trim(),
      description: description.trim(),
      company: company?.trim(),
      location: location?.trim(),
      employmentType: employmentType || 'other',
      salaryMin: salaryMin ? Number(salaryMin) : undefined,
      salaryMax: salaryMax ? Number(salaryMax) : undefined,
      skills: Array.isArray(skills) ? skills.filter(skill => skill.trim()) : [],
      applicationDeadline,
      jobCategory: jobCategory?.trim(),
      experienceLevel: experienceLevel || 'entry',
      workArrangement: workArrangement || 'on-site',
      requirements: Array.isArray(requirements) ? requirements.filter(req => req.trim()) : [],
      benefits: Array.isArray(benefits) ? benefits.filter(benefit => benefit.trim()) : [],
      contactEmail: contactEmail?.trim().toLowerCase(),
      applicationUrl: applicationUrl?.trim(),
      postedBy: req.user._id
    });

    const populated = await job.populate('postedBy', 'firstName lastName photo role');

    res.status(201).json({
      success: true,
      data: populated,
      message: 'Job posted successfully'
    });
  } catch (err) {
    next(err);
  }
};
exports.getMyJobs = async (req, res, next) => {
  try {
    // If no authenticated user, return empty array or handle as needed
    if (!req.user || !req.user._id) {
      return res.json({ success: true, count: 0, data: [], message: 'Authentication required to view your jobs' });
    }

    const jobs = await Job.find({ postedBy: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, count: jobs.length, data: jobs });
  } catch (err) {
    next(err);
  }
};

// Get all active jobs
exports.getJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find({ isActive: true }).sort({ createdAt: -1 }).populate('postedBy', 'firstName lastName photo role');
    res.json({ success: true, count: jobs.length, data: jobs });
  } catch (err) {
    next(err);
  }
};

// Deactivate a job (owner only)
exports.deactivateJob = async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      return next(new ErrorResponse('Authentication required to modify jobs', 401));
    }

    const job = await Job.findById(req.params.id);
    if (!job) return next(new ErrorResponse('Job not found', 404));
    if (String(job.postedBy) !== String(req.user._id)) {
      return next(new ErrorResponse('Not authorized to modify this job', 403));
    }
    job.isActive = false;
    await job.save();
    res.json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
};
