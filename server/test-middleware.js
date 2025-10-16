const auth = require('./middleware/auth');
console.log('Auth middleware loaded successfully');
console.log('Protect function exists:', typeof auth.protect === 'function');
