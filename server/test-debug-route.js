const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/messages/test-unread-counts/68df8299e877336de0e33e18',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  res.setEncoding('utf8');
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    console.log('Response:', body.substring(0, 100));
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.end();
