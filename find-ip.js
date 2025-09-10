const os = require('os');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (interface.family === 'IPv4' && !interface.internal) {
        console.log(`Found local IP: ${interface.address}`);
        console.log(`Update utils/api.ts with: const API_BASE_URL = 'http://${interface.address}:3000';`);
        return interface.address;
      }
    }
  }
  
  console.log('No local IP found. Make sure you are connected to a network.');
  return null;
}

getLocalIP(); 