// Test with a valid ObjectId format
const testUserId = '507f1f77bcf86cd799439011';
console.log('Testing with valid ObjectId:', testUserId);

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: `/api/messages/unread-counts/${testUserId}`,
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);

  res.setEncoding('utf8');
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    console.log('Response body:', body.substring(0, 200));
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();
