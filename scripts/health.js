const BASE_URL = 'http://localhost:3001';

const endpoints = [
  { name: 'GET /api/oi', url: `${BASE_URL}/api/oi` },
  { name: 'GET /api/rounds/current', url: `${BASE_URL}/api/rounds/current` },
  { name: 'GET /api/leaderboard', url: `${BASE_URL}/api/leaderboard` }
];

async function checkEndpoint(endpoint) {
  try {
    const response = await fetch(endpoint.url);
    if (response.ok) {
      console.log(`✓ ${endpoint.name} - OK (${response.status})`);
      return true;
    } else {
      console.log(`✗ ${endpoint.name} - FAIL (${response.status})`);
      return false;
    }
  } catch (error) {
    console.log(`✗ ${endpoint.name} - FAIL (${error.message})`);
    return false;
  }
}

async function runHealthCheck() {
  console.log('🏥 Running health check...\n');
  
  const results = await Promise.all(endpoints.map(checkEndpoint));
  
  const allPassed = results.every(r => r);
  
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✓ All endpoints healthy');
    process.exit(0);
  } else {
    console.log('✗ Some endpoints failed');
    process.exit(1);
  }
}

runHealthCheck();
