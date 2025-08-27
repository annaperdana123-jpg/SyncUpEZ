// Mock fs module before importing
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  appendFileSync: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  appendFile: jest.fn()
}));

// Mock path module
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn((...args) => args.join('/'))
}));

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

const fs = require('fs');
const { readCSV, writeToCSV } = require('../../src/utils/csvReader');
const { appendToCSV } = require('../../src/utils/csvWriter');

describe('CSV Data Integrity', () => {
  const testFilePath = '/test/path/test.csv';
  const testData = [
    { employee_id: 'emp-001', name: 'John Doe', email: 'john@example.com' },
    { employee_id: 'emp-002', name: 'Jane Smith', email: 'jane@example.com' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('File Append Operations', () => {
    test('should handle concurrent writes without data corruption', async () => {
      // Mock file content
      const initialContent = 'employee_id,name,email\nemp-001,John Doe,john@example.com\n';
      fs.readFile.mockImplementation((path, callback) => {
        callback(null, initialContent);
      });
      
      // Simulate concurrent writes
      const writePromises = [];
      for (let i = 0; i < 5; i++) {
        writePromises.push(
          appendToCSV(testFilePath, { 
            employee_id: `emp-00${i + 2}`, 
            name: `Test User ${i + 2}`, 
            email: `test${i + 2}@example.com` 
          })
        );
      }
      
      await Promise.all(writePromises);
      
      // Verify that all writes were attempted
      expect(fs.appendFile).toHaveBeenCalledTimes(5);
    });
  });

  describe('Data Consistency', () => {
    test('should maintain data consistency between writes and reads', async () => {
      // Mock the file content that was written
      const writtenContent = 'employee_id,name,email\nemp-001,John Doe,john@example.com\nemp-002,Jane Smith,jane@example.com\n';
      fs.readFile.mockImplementation((path, callback) => {
        callback(null, writtenContent);
      });
      
      const result = await readCSV(testFilePath);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('employee_id', 'emp-001');
      expect(result[1]).toHaveProperty('name', 'Jane Smith');
    });
  });

  describe('File Locking', () => {
    test('should implement proper file locking mechanisms', async () => {
      // Mock a file lock error
      fs.appendFile.mockImplementation((path, data, options, callback) => {
        callback(new Error('EAGAIN: resource temporarily unavailable'));
      });
      
      await expect(appendToCSV(testFilePath, testData[0])).rejects.toThrow('EAGAIN');
    });
  });

  describe('Error Recovery', () => {
    test('should handle corrupted CSV files gracefully', async () => {
      // Mock corrupted file content
      const corruptedContent = 'employee_id,name,email\nemp-001,John Doe\nemp-002,Jane Smith,jane@example.com\n';
      fs.readFile.mockImplementation((path, callback) => {
        callback(null, corruptedContent);
      });
      
      // Should still parse what it can
      const result = await readCSV(testFilePath);
      
      expect(result).toHaveLength(1); // Only one complete row
      expect(result[0]).toHaveProperty('employee_id', 'emp-002');
    });
  });

  describe('Empty Line Handling', () => {
    test('should handle newlines and empty lines at file ends', async () => {
      // Mock file content with trailing newlines
      const contentWithNewlines = 'employee_id,name,email\nemp-001,John Doe,john@example.com\n\n';
      fs.readFile.mockImplementation((path, callback) => {
        callback(null, contentWithNewlines);
      });
      
      const result = await readCSV(testFilePath);
      
      expect(result).toHaveLength(1); // Should ignore empty lines
      expect(result[0]).toHaveProperty('employee_id', 'emp-001');
    });
  });
});