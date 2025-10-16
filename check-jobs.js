const mongoose = require('mongoose');

async function checkJobs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/PROMOTION');
    const jobs = await mongoose.connection.db.collection('jobs').find({}).toArray();

    console.log('📋 Jobs in database:', jobs.length);
    jobs.forEach((job, i) => {
      console.log(`${i+1}. ${job.title} - ${job.isActive ? 'Active' : 'Inactive'} - Posted by: ${job.postedBy}`);
    });

    if (jobs.length === 0) {
      console.log('❌ No jobs found in database');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ DB Error:', err.message);
    process.exit(1);
  }
}

checkJobs();
