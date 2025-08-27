const fs = require('fs').promises;
const { readCSV } = require('../../../src/utils/csvReader');

// Mock fs module
jest.mock('fs').promises;

describe('CSV Reader Utility', () => {
  const testFilePath = '/test/data/employees.csv';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('readCSV', () => {
    test('should read and parse CSV file correctly', async () => {
      // Mock file content
      const mockCSVContent = 'employee_id,name,email\nemp-001,John Doe,john@example.com\nemp-002,Jane Smith,jane@example.com';
      fs.readFile.mockResolvedValue(mockCSVContent);
      
      const result = await readCSV(testFilePath);
      
      expect(result).toEqual([
        { employee_id: 'emp-001', name: 'John Doe', email: 'john@example.com' },
        { employee_id: 'emp-002', name: 'Jane Smith', email: 'jane@example.com' }
      ]);
      expect(fs.readFile).toHaveBeenCalledWith(testFilePath, 'utf8');
    });

    test('should handle empty CSV file', async () => {
      // Mock empty file content
      fs.readFile.mockResolvedValue('');
      
      const result = await readCSV(testFilePath);
      
      expect(result).toEqual([]);
    });

    test('should handle file read error', async () => {
      // Mock file read error
      fs.readFile.mockRejectedValue(new Error('File not found'));
      
      await expect(readCSV(testFilePath)).rejects.toThrow('File not found');
    });
  });
});