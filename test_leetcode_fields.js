const https = require('https');
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/problems/1',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5Ac2Nob29sLmVkdSIsInJvbGUiOiJhZG1pbiIsInR5cGUiOiJhZG1pbiIsImlhdCI6MTc1ODE1Nzk1NSwiZXhwIjoxNzU4MTg2NzU1LCJpc3MiOiJwcm9ncmFtbWluZy1jb250ZXN0LXBsYXRmb3JtIn0.8ikmN1gQTaiRemPk7T4-Ehw3iyhsGnPGwOsxkQlLlTo'
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('\n🔍 LeetCode Fields Test Results:');
      console.log('================================');
      console.log('✅ Function Name:', response.data.function_name || 'NOT FOUND');
      console.log('✅ Uses LeetCode Style:', response.data.uses_leetcode_style || 'NOT FOUND');
      console.log('✅ Return Type:', response.data.return_type || 'NOT FOUND');
      console.log('✅ Python Signature exists:', !!response.data.function_signature_python);
      console.log('✅ Function Parameters:', response.data.function_parameters || 'NOT FOUND');

      if (response.data.function_signature_python) {
        console.log('\n📝 Python Function Signature:');
        console.log(response.data.function_signature_python);
      }

      console.log('\n🎯 CONCLUSION: LeetCode fields are', response.data.function_name ? 'WORKING!' : 'MISSING!');
    } catch (error) {
      console.error('Error parsing response:', error);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
});

req.end();