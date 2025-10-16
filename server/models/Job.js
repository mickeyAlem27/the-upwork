const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    company: { type: String, trim: true },
    location: { type: String, trim: true },
    employmentType: { type: String, enum: ['full-time', 'part-time', 'contract', 'internship', 'temporary', 'other'], default: 'other' },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    salaryMin: { type: Number, min: 0 },
    salaryMax: { type: Number, min: 0 },
    skills: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true },
    applicationDeadline: { type: Date },
    jobCategory: { type: String, trim: true },
    experienceLevel: { type: String, enum: ['entry', 'mid', 'senior', 'executive'], default: 'entry' },
    workArrangement: { type: String, enum: ['on-site', 'remote', 'hybrid'], default: 'on-site' },
    requirements: [{ type: String, trim: true }],
    benefits: [{ type: String, trim: true }],
    contactEmail: { type: String, trim: true, lowercase: true },
    applicationUrl: { type: String, trim: true }
  },
  { timestamps: true }
);

// Index for better query performance
jobSchema.index({ isActive: 1, createdAt: -1 });
jobSchema.index({ employmentType: 1 });
jobSchema.index({ location: 1 });
jobSchema.index({ skills: 1 });

module.exports = mongoose.model('Job', jobSchema);
