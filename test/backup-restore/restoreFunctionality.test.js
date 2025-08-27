// Mock the Supabase client before importing modules
jest.mock('../../src/utils/supabaseClient', () => ({
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'user-id',
          email: 'test@example.com',
          user_metadata: {
            tenant_id: 'test-tenant'
          }
        }
      },
      error: null
    })
  }
}));

// Mock the backup service and utils
jest.mock('../../src/utils/backupUtils', () => ({
  restoreFromBackup: jest.fn().mockResolvedValue(true),
  verifyBackupIntegrity: jest.fn().mockResolvedValue(true),
  calculateFileChecksum: jest.fn().mockReturnValue('abc123def456')
}));

const request = require('supertest');
const app = require('../../server');
const { createMockEmployee, createMockTenant } = require('../testDataFactory');

// Import the mocked modules to set up test behavior
const backupUtils = require('../../src/utils/backupUtils');

describe('Restore Functionality', () => {
  let testTenant, testEmployee, authToken;

  beforeAll(async () => {
    // Setup test tenant and employee
    testTenant = createMockTenant();
    testEmployee = createMockEmployee();
  });

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Backup Restoration', () => {
    test('should restore from backup successfully', async () => {
      const response = await request(app)
        .post('/api/backups/restore')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer fake-token`)
        .send({
          backupFileName: 'employees.csv.backup-2023-01-01T00-00-00.000Z',
          targetFileName: 'employees.csv'
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('message', 'Backup restored successfully');
      expect(backupUtils.restoreFromBackup).toHaveBeenCalled();
    }, 10000); // Increase timeout

    test('should handle restore with missing backup file name', async () => {
      const response = await request(app)
        .post('/api/backups/restore')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer fake-token`)
        .send({
          // Missing backupFileName
          targetFileName: 'employees.csv'
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Missing backup file name');
    }, 10000); // Increase timeout

    test('should handle restore with missing target file name', async () => {
      const response = await request(app)
        .post('/api/backups/restore')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer fake-token`)
        .send({
          backupFileName: 'employees.csv.backup-2023-01-01T00-00-00.000Z'
          // Missing targetFileName
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Missing target file name');
    }, 10000); // Increase timeout

    test('should handle restore with non-existent backup file', async () => {
      // Make the backup utils throw an error
      backupUtils.restoreFromBackup.mockRejectedValueOnce(new Error('Backup file does not exist'));
      
      const response = await request(app)
        .post('/api/backups/restore')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer fake-token`)
        .send({
          backupFileName: 'non-existent-backup.csv',
          targetFileName: 'employees.csv'
        })
        .expect(500);
      
      expect(response.body).toHaveProperty('error');
      expect(backupUtils.restoreFromBackup).toHaveBeenCalled();
    }, 10000); // Increase timeout
  });

  describe('Backup Integrity Verification', () => {
    test('should verify backup integrity successfully', async () => {
      const response = await request(app)
        .post('/api/backups/verify')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer fake-token`)
        .send({
          backupFileName: 'employees.csv.backup-2023-01-01T00-00-00.000Z',
          expectedChecksum: 'abc123def456'
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('message', 'Backup integrity verification completed');
      expect(response.body).toHaveProperty('isValid', true);
      expect(backupUtils.verifyBackupIntegrity).toHaveBeenCalled();
    }, 10000); // Increase timeout

    test('should handle integrity verification with missing backup file name', async () => {
      const response = await request(app)
        .post('/api/backups/verify')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer fake-token`)
        .send({
          // Missing backupFileName
          expectedChecksum: 'abc123def456'
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Missing backup file name');
    }, 10000); // Increase timeout

    test('should handle integrity verification with missing expected checksum', async () => {
      const response = await request(app)
        .post('/api/backups/verify')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer fake-token`)
        .send({
          backupFileName: 'employees.csv.backup-2023-01-01T00-00-00.000Z'
          // Missing expectedChecksum
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Missing expected checksum');
    }, 10000); // Increase timeout

    test('should handle integrity verification with non-existent backup file', async () => {
      // Make the backup utils return false for integrity check
      backupUtils.verifyBackupIntegrity.mockResolvedValueOnce(false);
      
      const response = await request(app)
        .post('/api/backups/verify')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer fake-token`)
        .send({
          backupFileName: 'non-existent-backup.csv',
          expectedChecksum: 'abc123def456'
        })
        .expect(200); // Should return isValid: false, not an error
      
      expect(response.body).toHaveProperty('message', 'Backup integrity verification completed');
      expect(response.body).toHaveProperty('isValid', false);
      expect(backupUtils.verifyBackupIntegrity).toHaveBeenCalled();
    }, 10000); // Increase timeout
  });
});