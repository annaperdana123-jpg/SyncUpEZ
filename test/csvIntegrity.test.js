const fs = require('fs');
const path = require('path');
const { appendToTenantCSV } = require('../src/utils/tenantCsvUtils');
const { readTenantCSV } = require('../src/utils/tenantCsvUtils');
const { createMockEmployee } = require('./testDataFactory');

describe('CSV Data Integrity Tests', () => {
  const testTenantId = 'test_tenant';
  const testFilePath = path.join(__dirname, `../data/${testTenantId}`);
  const employeesFile = 'employees.csv';

  beforeAll(() => {
    // Create test tenant directory if it doesn't exist
    if (!fs.existsSync(testFilePath)) {
      fs.mkdirSync(testFilePath, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(testFilePath)) {
      fs.rmSync(testFilePath, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Clear the employees file before each test
    const filePath = path.join(testFilePath, employeesFile);
    if (fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '');
    }
  });

  test('should handle concurrent writes without duplication', async () => {
    const mockEmployees = [];
    const promises = [];
    
    // Create 10 mock employees
    for (let i = 0; i < 10; i++) {
      const employee = createMockEmployee({ 
        employee_id: `emp_concurrent_${i}_${Date.now()}`,
        email: `concurrent${i}_${Date.now()}@example.com`
      });
      mockEmployees.push(employee);
    }
    
    // Perform concurrent writes
    for (const employee of mockEmployees) {
      promises.push(appendToTenantCSV(testTenantId, employeesFile, employee));
    }
    
    // Wait for all writes to complete
    await Promise.all(promises);
    
    // Read all employees from the file
    const employees = await readTenantCSV(testTenantId, employeesFile);
    
    // Verify no duplicate entries
    const employeeIds = employees.map(e => e.employee_id);
    const uniqueIds = new Set(employeeIds);
    
    expect(employees.length).toBe(uniqueIds.size);
    expect(employees.length).toBe(10);
    
    // Verify all employees were written
    for (const mockEmployee of mockEmployees) {
      expect(employeeIds).toContain(mockEmployee.employee_id);
    }
  });

  test('should maintain data consistency under high load', async () => {
    const mockEmployees = [];
    const promises = [];
    
    // Create 50 mock employees
    for (let i = 0; i < 50; i++) {
      const employee = createMockEmployee({ 
        employee_id: `emp_load_${i}_${Date.now()}`,
        email: `load${i}_${Date.now()}@example.com`
      });
      mockEmployees.push(employee);
    }
    
    // Perform concurrent writes with slight delays to simulate real-world conditions
    for (let i = 0; i < mockEmployees.length; i++) {
      // Add a small delay for every 10th write to simulate varying request times
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      promises.push(appendToTenantCSV(testTenantId, employeesFile, mockEmployees[i]));
    }
    
    // Wait for all writes to complete
    await Promise.all(promises);
    
    // Read all employees from the file
    const employees = await readTenantCSV(testTenantId, employeesFile);
    
    // Verify no duplicate entries
    const employeeIds = employees.map(e => e.employee_id);
    const uniqueIds = new Set(employeeIds);
    
    expect(employees.length).toBe(uniqueIds.size);
    expect(employees.length).toBe(50);
  });

  test('should handle concurrent reads and writes safely', async () => {
    // First, add some initial data
    const initialEmployee = createMockEmployee({ 
      employee_id: `emp_initial_${Date.now()}`,
      email: `initial_${Date.now()}@example.com`
    });
    
    await appendToTenantCSV(testTenantId, employeesFile, initialEmployee);
    
    // Perform concurrent reads and writes
    const readPromises = [];
    const writePromises = [];
    
    // Create 5 mock employees for writing
    for (let i = 0; i < 5; i++) {
      const employee = createMockEmployee({ 
        employee_id: `emp_mixed_${i}_${Date.now()}`,
        email: `mixed${i}_${Date.now()}@example.com`
      });
      
      writePromises.push(appendToTenantCSV(testTenantId, employeesFile, employee));
    }
    
    // Perform 5 concurrent reads
    for (let i = 0; i < 5; i++) {
      readPromises.push(readTenantCSV(testTenantId, employeesFile));
    }
    
    // Execute all operations concurrently
    const writeResults = await Promise.all(writePromises);
    const readResults = await Promise.all(readPromises);
    
    // Verify all writes were successful
    expect(writeResults).toHaveLength(5);
    
    // Verify reads returned consistent data
    for (const readResult of readResults) {
      // Each read should contain at least the initial employee
      expect(readResult.length).toBeGreaterThanOrEqual(1);
      
      // Check that the initial employee is present
      const employeeIds = readResult.map(e => e.employee_id);
      expect(employeeIds).toContain(initialEmployee.employee_id);
    }
  });

  test('should handle empty line scenarios correctly', async () => {
    // Add an employee
    const employee1 = createMockEmployee({ 
      employee_id: `emp_empty1_${Date.now()}`,
      email: `empty1_${Date.now()}@example.com`
    });
    
    await appendToTenantCSV(testTenantId, employeesFile, employee1);
    
    // Manually add some empty lines to simulate file corruption
    const filePath = path.join(testFilePath, employeesFile);
    fs.appendFileSync(filePath, '\n\n');
    
    // Add another employee
    const employee2 = createMockEmployee({ 
      employee_id: `emp_empty2_${Date.now()}`,
      email: `empty2_${Date.now()}@example.com`
    });
    
    await appendToTenantCSV(testTenantId, employeesFile, employee2);
    
    // Read all employees - should handle empty lines gracefully
    const employees = await readTenantCSV(testTenantId, employeesFile);
    
    // Should have 2 employees despite empty lines
    expect(employees.length).toBe(2);
    
    const employeeIds = employees.map(e => e.employee_id);
    expect(employeeIds).toContain(employee1.employee_id);
    expect(employeeIds).toContain(employee2.employee_id);
  });
});