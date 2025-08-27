// Set environment variables before importing modules
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_KEY = 'test-key';

const employeeService = require('../../../src/services/employeeService');
const employeeRepository = require('../../../src/repositories/employeeRepository');
const { createMockEmployee } = require('../../testDataFactory');

// Mock the employee repository
jest.mock('../../../src/repositories/employeeRepository');

describe('Employee Service', () => {
  const testTenantId = 'test-tenant';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getEmployees', () => {
    test('should return paginated employee data', async () => {
      // Arrange
      const mockEmployees = {
        data: [createMockEmployee()],
        pagination: { page: 1, limit: 10, totalCount: 1, totalPages: 1 }
      };
      employeeRepository.getEmployees.mockResolvedValue(mockEmployees);

      // Act
      const result = await employeeService.getEmployees(testTenantId, 1, 10);

      // Assert
      expect(result).toEqual(mockEmployees);
      expect(employeeRepository.getEmployees).toHaveBeenCalledWith(testTenantId, 1, 10);
    });
  });

  describe('getEmployeeById', () => {
    test('should return employee when found', async () => {
      // Arrange
      const mockEmployee = createMockEmployee();
      // Remove password from mock employee as it's no longer stored
      delete mockEmployee.password;
      employeeRepository.getEmployeeById.mockResolvedValue(mockEmployee);

      // Act
      const result = await employeeService.getEmployeeById(testTenantId, mockEmployee.employee_id);

      // Assert
      expect(result).toEqual(mockEmployee);
      expect(employeeRepository.getEmployeeById).toHaveBeenCalledWith(testTenantId, mockEmployee.employee_id);
    });

    test('should throw error when employee not found', async () => {
      // Arrange
      employeeRepository.getEmployeeById.mockImplementation(() => {
        throw new Error('Employee not found');
      });

      // Act & Assert
      await expect(employeeService.getEmployeeById(testTenantId, 'non-existent-id'))
        .rejects
        .toThrow('Employee not found');
    });
  });

  describe('createEmployee', () => {
    test('should create employee successfully', async () => {
      // Arrange
      const mockEmployee = createMockEmployee();
      // Remove password from mock employee as it's no longer stored
      delete mockEmployee.password;
      employeeRepository.createEmployee.mockResolvedValue(mockEmployee);
      employeeRepository.employeeIdExists.mockResolvedValue(false);
      employeeRepository.emailExists.mockResolvedValue(false);

      // Act
      const result = await employeeService.createEmployee(testTenantId, mockEmployee);

      // Assert
      expect(result).toEqual(mockEmployee);
      expect(employeeRepository.createEmployee).toHaveBeenCalledWith(testTenantId, mockEmployee);
    });

    test('should throw error when employee ID already exists', async () => {
      // Arrange
      const mockEmployee = createMockEmployee();
      // Remove password from mock employee as it's no longer stored
      delete mockEmployee.password;
      employeeRepository.employeeIdExists.mockResolvedValue(true);

      // Act & Assert
      await expect(employeeService.createEmployee(testTenantId, mockEmployee))
        .rejects
        .toThrow('Employee ID already exists');
    });

    test('should throw error when email already exists', async () => {
      // Arrange
      const mockEmployee = createMockEmployee();
      // Remove password from mock employee as it's no longer stored
      delete mockEmployee.password;
      employeeRepository.employeeIdExists.mockResolvedValue(false);
      employeeRepository.emailExists.mockResolvedValue(true);

      // Act & Assert
      await expect(employeeService.createEmployee(testTenantId, mockEmployee))
        .rejects
        .toThrow('Email already exists');
    });
  });

  describe('updateEmployee', () => {
    test('should update employee successfully', async () => {
      // Arrange
      const mockEmployee = createMockEmployee();
      // Remove password from mock employee as it's no longer stored
      delete mockEmployee.password;
      const updateData = { 
        employee_id: mockEmployee.employee_id,
        name: 'Updated Name',
        email: mockEmployee.email
        // Removed password from update data as it's handled by Supabase Auth
      };
      employeeRepository.updateEmployee.mockResolvedValue({ ...mockEmployee, name: 'Updated Name' });

      // Act
      const result = await employeeService.updateEmployee(testTenantId, mockEmployee.employee_id, updateData);

      // Assert
      expect(result).toEqual({ ...mockEmployee, name: 'Updated Name' });
      expect(employeeRepository.updateEmployee).toHaveBeenCalledWith(testTenantId, mockEmployee.employee_id, updateData);
    });
  });

  describe('deleteEmployee', () => {
    test('should delete employee successfully', async () => {
      // Arrange
      const mockEmployee = createMockEmployee();
      // Remove password from mock employee as it's no longer stored
      delete mockEmployee.password;
      employeeRepository.deleteEmployee.mockResolvedValue(mockEmployee);

      // Act
      const result = await employeeService.deleteEmployee(testTenantId, mockEmployee.employee_id);

      // Assert
      expect(result).toEqual(mockEmployee);
      expect(employeeRepository.deleteEmployee).toHaveBeenCalledWith(testTenantId, mockEmployee.employee_id);
    });
  });
});