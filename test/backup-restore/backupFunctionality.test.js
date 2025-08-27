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
  ]),
  createAllBackups: jest.fn().mockResolvedValue({
    'tenant1': [
      { file: 'employees.csv', success: true },
      { file: 'interactions.csv', success: true }
    ]
  }),
  getBackupScheduleStatus: jest.fn().mockReturnValue({ scheduled: true })
}));

jest.mock('../../src/utils/backupUtils', () => ({
  listBackups: jest.fn().mockResolvedValue([
    {
      fileName: 'employees.csv.backup-2023-01-01T00-00-00.000Z',
      filePath: '/backups/employees.csv.backup-2023-01-01T00-00-00.000Z',
      size: 1024,
      createdAt: '2023-01-01T00:00:00.000Z',
      modifiedAt: '2023-01-01T00:00:00.000Z'
    },
    {
      fileName: 'interactions.csv.backup-2023-01-01T00-00-00.000Z',
      filePath: '/backups/interactions.csv.backup-2023-01-01T00-00-00.000Z',
      size: 2048,
      createdAt: '2023-01-01T00:00:00.000Z',
      modifiedAt: '2023-01-01T00:00:00.000Z'
    }
  ]),
  restoreFromBackup: jest.fn().mockResolvedValue(true),
  verifyBackupIntegrity: jest.fn().mockResolvedValue(true)
}));

const request = require('supertest');
const app = require('../../server');
const { createMockEmployee, createMockTenant } = require('../testDataFactory');

// Import the mocked modules to set up test behavior
const backupService = require('../../src/services/backupService');
const backupUtils = require('../../src/utils/backupUtils');

describe('Backup Functionality', () => {
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

  describe('Tenant-Specific Backup Creation', () => {
    test('should create backup successfully for tenant with all CSV files', async () => {
      const response = await request(app)
        .post('/api/backups/create')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer fake-token`)
        .expect(200);
      
      expect(response.body).toHaveProperty('message', 'Backup process completed');
      expect(response.body).toHaveProperty('tenantId', testTenant.tenantId);
      expect(backupService.createTenantBackups).toHaveBeenCalledWith(testTenant.tenantId);
    });

    test('should handle backup creation errors gracefully', async () => {
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

  describe('Backup Listing', () => {
    test('should list all available backups', async () => {
      const response = await request(app)
        .get('/api/backups/list')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer fake-token`)
        .expect(200);
      
      expect(response.body).toHaveProperty('message', 'Backup files retrieved successfully');
      expect(response.body).toHaveProperty('count', 2);
      expect(response.body).toHaveProperty('backups');
      expect(Array.isArray(response.body.backups)).toBe(true);
      expect(response.body.backups.length).toBe(2);
      expect(backupUtils.listBackups).toHaveBeenCalled();
    });

    test('should handle backup listing errors gracefully', async () => {
      // Make the backup utils throw an error
      backupUtils.listBackups.mockRejectedValueOnce(new Error('List failed'));
      
      const response = await request(app)
        .get('/api/backups/list')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer fake-token`)
        .expect(500);
      
      expect(response.body).toHaveProperty('error');
      expect(backupUtils.listBackups).toHaveBeenCalled();
    });
  });

  describe('Backup Schedule Status', () => {
    test('should get backup schedule status', async () => {
      const response = await request(app)
        .get('/api/backups/status')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer fake-token`)
        .expect(200);
      
      expect(response.body).toHaveProperty('message', 'Backup schedule status retrieved');
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toHaveProperty('scheduled');
      expect(backupService.getBackupScheduleStatus).toHaveBeenCalled();
    });
  });
});