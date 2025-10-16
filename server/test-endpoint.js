const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/messages/unread-counts/68e3a2e15ab6d1e5e86e3edb',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer test-token-123'
  }
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
    console.log('Response body:', body);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();
