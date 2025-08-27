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
jest.mock('../../src/services/backupService', () => ({
  createTenantBackups: jest.fn().mockResolvedValue([
    { file: 'employees.csv', success: true },
    { file: 'interactions.csv', success: true }
  ])
}));

jest.mock('../../src/utils/backupUtils', () => ({
  listBackups: jest.fn().mockResolvedValue([
    {
      fileName: 'backup-2023-01-01.zip',
      filePath: '/backups/backup-2023-01-01.zip',
      size: 1024,
      createdAt: '2023-01-01T00:00:00.000Z',
      modifiedAt: '2023-01-01T00:00:00.000Z'
    },
    {
      fileName: 'backup-2023-01-02.zip',
      filePath: '/backups/backup-2023-01-02.zip',
      size: 2048,
      createdAt: '2023-01-02T00:00:00.000Z',
      modifiedAt: '2023-01-02T00:00:00.000Z'
    }
  ]),
  restoreFromBackup: jest.fn().mockResolvedValue(true)
}));

const request = require('supertest');
const app = require('../../server');
const { createMockEmployee, createMockTenant } = require('../testDataFactory');

// Import the mocked modules to set up test behavior
const backupService = require('../../src/services/backupService');
const backupUtils = require('../../src/utils/backupUtils');

describe('Backup and Restore', () => {
  let testTenant, testEmployee, authToken;

  beforeAll(async () => {
    // Setup test tenant and employee
    testTenant = createMockTenant();
    testEmployee = createMockEmployee();
  });

  describe('Backup Functionality', () => {
    test('should create backup successfully', async () => {
      const response = await request(app)
        .post('/api/backups/create')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer fake-token`)
        .expect(200);
      
      expect(response.body).toHaveProperty('message', 'Backup process completed');
      expect(backupService.createTenantBackups).toHaveBeenCalledWith(testTenant.tenantId);
    });

    test('should list backups', async () => {
      const response = await request(app)
        .get('/api/backups/list')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer fake-token`)
        .expect(200);
      
      expect(response.body).toHaveProperty('backups');
      expect(Array.isArray(response.body.backups)).toBe(true);
      expect(response.body.backups.length).toBe(2);
      expect(backupUtils.listBackups).toHaveBeenCalled();
    });

    test('should handle backup errors gracefully', async () => {
      // Make the backup service throw an error
      backupService.createTenantBackups.mockRejectedValueOnce(new Error('Backup failed'));
      
      const response = await request(app)
        .post('/api/backups/create')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer fake-token`)
        .expect(500);
      
      expect(response.body).toHaveProperty('error');
      expect(backupService.createTenantBackups).toHaveBeenCalledWith(testTenant.tenantId);
    });
  });

  describe('Restore Functionality', () => {
    test('should restore from backup successfully', async () => {
      const response = await request(app)
        .post('/api/backups/restore')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer fake-token`)
        .send({ 
          backupFileName: 'backup-2023-01-01.zip',
          targetFileName: 'employees.csv'
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('message', 'Backup restored successfully');
      expect(backupUtils.restoreFromBackup).toHaveBeenCalled();
    });

    test('should handle restore errors gracefully', async () => {
      // Make the backup utils throw an error
      backupUtils.restoreFromBackup.mockRejectedValueOnce(new Error('Restore failed'));
      
      const response = await request(app)
        .post('/api/backups/restore')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer fake-token`)
        .send({ 
          backupFileName: 'non-existent-backup.zip',
          targetFileName: 'employees.csv'
        })
        .expect(500);
      
      expect(response.body).toHaveProperty('error');
      expect(backupUtils.restoreFromBackup).toHaveBeenCalled();
    });

    test('should validate backup file before restore', async () => {
      const response = await request(app)
        .post('/api/backups/restore')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer fake-token`)
        .send({ 
          backupFileName: '', // Empty backup file
          targetFileName: 'employees.csv'
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Missing backup file name');
    });
  });
});