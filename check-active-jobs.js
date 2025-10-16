const mongoose = require('mongoose');

async function checkActiveJobs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/PROMOTION');
    const jobs = await mongoose.connection.db.collection('jobs').find({isActive: true}).toArray();

    console.log('📋 Active jobs in database:', jobs.length);
    jobs.forEach((job, i) => {
      console.log(`${i+1}. ${job.title} by ${job.postedBy} - ${job.isActive ? 'Active' : 'Inactive'}`);
    });

    if (jobs.length === 0) {
      console.log('❌ No active jobs found in database');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ DB Error:', err.message);
    process.exit(1);
  }
}

checkActiveJobs();
