const controller = require('./controllers/messageController');
console.log('Controller loaded successfully');
console.log('getUnreadCounts function exists:', typeof controller.getUnreadCounts === 'function');
