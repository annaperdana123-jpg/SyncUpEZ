const fs = require('fs').promises;
const { appendToCSV, writeToCSV } = require('../../../src/utils/csvWriter');

// Mock fs module
jest.mock('fs').promises;

describe('CSV Writer Utility', () => {
  const testFilePath = '/test/data/employees.csv';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('appendToCSV', () => {
    test('should append data to CSV file', async () => {
      const data = { employee_id: 'emp-001', name: 'John Doe', email: 'john@example.com' };
      
      await appendToCSV(testFilePath, data);
      
      expect(fs.appendFile).toHaveBeenCalledWith(
        testFilePath,
        'emp-001,John Doe,john@example.com\n',
        'utf8'
      );
    });

    test('should handle append error', async () => {
      const data = { employee_id: 'emp-001', name: 'John Doe', email: 'john@example.com' };
      fs.appendFile.mockRejectedValue(new Error('Permission denied'));
      
      await expect(appendToCSV(testFilePath, data)).rejects.toThrow('Permission denied');
    });
  });

  describe('writeToCSV', () => {
    test('should write header and data to CSV file', async () => {
      const data = [
        { employee_id: 'emp-001', name: 'John Doe', email: 'john@example.com' },
        { employee_id: 'emp-002', name: 'Jane Smith', email: 'jane@example.com' }
      ];
      
      await writeToCSV(testFilePath, data);
      
      expect(fs.writeFile).toHaveBeenCalledWith(
        testFilePath,
        'employee_id,name,email\nemp-001,John Doe,john@example.com\nemp-002,Jane Smith,jane@example.com\n',
        'utf8'
      );
    });

    test('should handle write error', async () => {
      const data = [{ employee_id: 'emp-001', name: 'John Doe', email: 'john@example.com' }];
      fs.writeFile.mockRejectedValue(new Error('Disk full'));
      
      await expect(writeToCSV(testFilePath, data)).rejects.toThrow('Disk full');
    });
  });
});