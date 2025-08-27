// Mock fs module before importing
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  appendFileSync: jest.fn()
}));

// Mock path module
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn((...args) => args.join('/'))
}));

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

// Mock csvReader
jest.mock('../../../src/utils/csvReader', () => ({
  readCSV: jest.fn()
}));

// Mock csvWriter
jest.mock('../../../src/utils/csvWriter', () => ({
  appendCSV: jest.fn()
}));

const fs = require('fs');
const path = require('path');
const { readTenantCSV, appendToTenantCSV } = require('../../../src/utils/tenantCsvUtils');
const { readCSV } = require('../../../src/utils/csvReader');
const { appendCSV } = require('../../../src/utils/csvWriter');

describe('Tenant CSV Utils', () => {
  const mockTenantId = 'test-tenant';
  const mockFileName = 'employees.csv';

  beforeEach(() => {
    jest.clearAllMocks();
    // Set up path.join mock to return predictable paths
    path.join.mockImplementation((...args) => args.join('/'));
  });

  describe('readTenantCSV', () => {
    test('should read CSV file for tenant', async () => {
      const mockData = [
        { id: '1', name: 'John Doe' },
        { id: '2', name: 'Jane Smith' }
      ];
      
      readCSV.mockResolvedValue(mockData);
      
      const result = await readTenantCSV(mockTenantId, mockFileName);
      
      expect(readCSV).toHaveBeenCalledWith(`../../data/${mockTenantId}/${mockFileName}`);
      expect(result).toEqual(mockData);
    });

    test('should return empty array if file does not exist', async () => {
      readCSV.mockRejectedValue(new Error('File not found'));
      
      const result = await readTenantCSV(mockTenantId, mockFileName);
      
      expect(readCSV).toHaveBeenCalledWith(`../../data/${mockTenantId}/${mockFileName}`);
      expect(result).toEqual([]);
    });
  });

  describe('appendToTenantCSV', () => {
    test('should append to CSV file', async () => {
      const mockData = { id: '1', name: 'John Doe' };
      
      appendCSV.mockResolvedValue();
      
      await appendToTenantCSV(mockTenantId, mockFileName, mockData);
      
      expect(appendCSV).toHaveBeenCalledWith(
        `../../data/${mockTenantId}/${mockFileName}`,
        mockData
      );
    });

    test('should handle errors when appending to CSV file', async () => {
      const mockData = { id: '1', name: 'John Doe' };
      
      appendCSV.mockRejectedValue(new Error('Failed to append'));
      
      await expect(appendToTenantCSV(mockTenantId, mockFileName, mockData))
        .rejects.toThrow('Failed to append to tenant CSV file');
    });
  });
});