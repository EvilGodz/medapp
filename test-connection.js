const axios = require('axios');

async function testConnection() {
  const baseURL = 'http://192.168.1.89:3000';
  
  try {
    console.log('Testing connection to:', baseURL);
    
    // Test basic endpoint
    const response = await axios.get(`${baseURL}/`);
    console.log('✅ Basic endpoint response:', response.data);
    
    // Test health endpoint
    const healthResponse = await axios.get(`${baseURL}/api/health`);
    console.log('✅ Health endpoint response:', healthResponse.data);
    
    console.log('\n🎉 Server is accessible!');
    console.log('The network configuration is correct.');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Solution: Start the backend server with:');
      console.log('cd backend && npm start');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Solution: Check your IP address in utils/api.ts');
      console.log('Run: node find-ip.js to get your current IP');
    } else {
      console.log('\n💡 Possible solutions:');
      console.log('1. Make sure backend server is running');
      console.log('2. Check if port 3000 is available');
      console.log('3. Check Windows Firewall settings');
      console.log('4. Ensure phone and computer are on same network');
    }
  }
}

testConnection(); 