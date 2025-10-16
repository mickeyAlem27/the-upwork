// Test the actual controller method directly
const controller = require('./controllers/messageController');

async function testController() {
  try {
    // Mock request and response objects
    const req = {
      params: { userId: '68df8299e877336de0e33e18' }
    };

    const res = {
      json: (data) => {
        console.log('Controller response:', JSON.stringify(data, null, 2));
      },
      status: (code) => {
        console.log('Status code would be:', code);
        return res;
      }
    };

    console.log('Testing controller method...');
    await controller.getUnreadCounts(req, res);
    console.log('Controller test completed');
  } catch (error) {
    console.error('Controller error:', error.message);
  }
}

testController();
