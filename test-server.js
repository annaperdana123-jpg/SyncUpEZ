// Simple test script to verify basic functionality
const axios = require('axios');

async function testServer() {
  const baseURL = 'http://localhost:3000';
  
  try {
    // Test server status
    console.log('Testing server status...');
    const statusResponse = await axios.get(`${baseURL}/`);
    console.log('Server status:', statusResponse.data);
    
    // Test creating an employee
    console.log('\nTesting employee creation...');
    const employeeData = {
      employee_id: 'emp001',
      name: 'John Doe',
      email: 'john.doe@example.com',
      department: 'Engineering',
      team: 'Backend',
      role: 'Software Engineer',
      hire_date: '2023-01-15'
    };
    
    const createResponse = await axios.post(`${baseURL}/api/employees`, employeeData);
    console.log('Create employee response:', createResponse.data);
    
    // Test getting all employees
    console.log('\nTesting employee retrieval...');
    const getResponse = await axios.get(`${baseURL}/api/employees`);
    console.log('Get employees response:', getResponse.data);
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Status code:', error.response.status);
    }
  }
}

// Run the test
testServer();