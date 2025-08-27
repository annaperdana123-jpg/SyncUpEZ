// Set environment variables before importing modules
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_KEY = 'test-key';

const analyticsService = require('../../../src/services/analyticsService');
const employeeRepository = require('../../../src/repositories/employeeRepository');
const { createMockEmployee } = require('../../testDataFactory');

// Mock repositories
jest.mock('../../../src/repositories/employeeRepository');

describe('Analytics Service', () => {
  const testTenantId = 'test-tenant';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getEmployeeAnalytics', () => {
    test('should return employee analytics', async () => {
      // Arrange
      const mockEmployee = createMockEmployee();
      employeeRepository.getEmployeeById.mockResolvedValue(mockEmployee);

      // Act
      const result = await analyticsService.getEmployeeAnalytics(testTenantId, mockEmployee.employee_id);

      // Assert
      expect(result).toEqual({
        employee_id: mockEmployee.employee_id,
        name: mockEmployee.name,
        department: mockEmployee.department,
        team: mockEmployee.team,
        role: mockEmployee.role
      });
      expect(employeeRepository.getEmployeeById).toHaveBeenCalledWith(testTenantId, mockEmployee.employee_id);
    });

    test('should throw error when employee not found', async () => {
      // Arrange
      employeeRepository.getEmployeeById.mockResolvedValue(null);

      // Act & Assert
      await expect(analyticsService.getEmployeeAnalytics(testTenantId, 'non-existent-id'))
        .rejects
        .toThrow('Employee not found');
    });
  });

  describe('getOverallStats', () => {
    test('should return overall statistics', async () => {
      // Arrange
      const mockEmployees = [createMockEmployee(), createMockEmployee()];
      employeeRepository.getEmployees.mockResolvedValue({ data: mockEmployees });

      // Act
      const result = await analyticsService.getOverallStats(testTenantId);

      // Assert
      expect(result).toEqual({
        total_employees: 2,
        departments: expect.any(Array),
        teams: expect.any(Array)
      });
      expect(employeeRepository.getEmployees).toHaveBeenCalledWith(testTenantId, 1, 1000);
    });
  });
});