const axios = require('axios');

async function testAPI() {
  const baseURL = 'http://localhost:3001';
  
  try {
    // Test health endpoint
    console.log('Testing health endpoint...');
    const healthResponse = await axios.get(`${baseURL}/health`);
    console.log('Health check:', healthResponse.data);
    
    // Test recommendation endpoint
    console.log('\nTesting recommendation endpoint...');
    const query = "I am hiring for Java developers who can also collaborate effectively with my business teams.";
    const recommendResponse = await axios.post(`${baseURL}/recommend`, { query });
    
    console.log('Recommendations received:', recommendResponse.data.recommended_assessments.length);
    console.log('First recommendation:', recommendResponse.data.recommended_assessments[0]);
    
    console.log('\n✅ API tests passed!');
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testAPI();