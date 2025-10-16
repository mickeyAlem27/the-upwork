const path = require('path');

// Change to server directory
process.chdir(path.join(__dirname));

try {
  const routes = require('./routes/messageRoutes');
  console.log('Routes loaded successfully');

  // Check if the route exists
  const router = routes;
  console.log('Router stack length:', router.stack ? router.stack.length : 'No stack');

  if (router.stack) {
    router.stack.forEach((layer, index) => {
      console.log(`Layer ${index}:`, layer.route ? layer.route.path : 'No route');
    });
  }
} catch (error) {
  console.error('Error loading routes:', error.message);
  console.error('Stack:', error.stack);
}
