// Test route directly without going through the full server
const express = require('express');
const app = express();

// Simple test route
app.get('/api/messages/unread-counts/:userId', (req, res) => {
  console.log('Route matched! userId:', req.params.userId);
  res.json({
    success: true,
    data: {
      test: 'Route is working',
      userId: req.params.userId
    }
  });
});

// 404 handler
app.use((req, res) => {
  console.log('404 - Route not found:', req.path);
  res.status(404).json({ error: 'Not Found', path: req.path });
});

const server = app.listen(5001, () => {
  console.log('Test server running on port 5001');
});
