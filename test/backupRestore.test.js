const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../server');
const { createMockEmployee, createMockTenant } = require('./testDataFactory');

describe('Backup and Restore Functionality Tests', () => {
  let testTenant, testEmployee, authToken;

  beforeAll(async () => {
    // Create mock tenant and employee
    testTenant = createMockTenant();
    testEmployee = createMockEmployee();

    // Create the employee
    await request(app)
      .post('/api/employees')
      .set('X-Tenant-ID', testTenant.tenantId)
      .send(testEmployee)
      .expect(201);

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .set('X-Tenant-ID', testTenant.tenantId)
      .send({
        email: testEmployee.email,
        password: testEmployee.password
      })
      .expect(200);

    authToken = loginResponse.body.token;
  });

  test('should create backup for tenant', async () => {
    const response = await request(app)
      .post('/api/backups/create')
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Tenant-ID', testTenant.tenantId)
      .expect(200);

    expect(response.body).toHaveProperty('message', 'Backup process completed');
    expect(response.body).toHaveProperty('tenantId', testTenant.tenantId);
    expect(response.body).toHaveProperty('successful');
    expect(response.body).toHaveProperty('failed');
  });

  test('should list backup files', async () => {
    const response = await request(app)
      .get('/api/backups/list')
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Tenant-ID', testTenant.tenantId)
      .expect(200);

    expect(response.body).toHaveProperty('message', 'Backup files retrieved successfully');
    expect(response.body).toHaveProperty('count');
    expect(response.body).toHaveProperty('backups');
  });

  test('should get backup schedule status', async () => {
    const response = await request(app)
      .get('/api/backups/status')
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Tenant-ID', testTenant.tenantId)
      .expect(200);

    expect(response.body).toHaveProperty('message', 'Backup schedule status retrieved');
    expect(response.body).toHaveProperty('status');
  });

  test('should handle backup creation with invalid tenant', async () => {
    const response = await request(app)
      .post('/api/backups/create')
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Tenant-ID', 'nonexistent_tenant')
      .expect(500); // Expected to fail for nonexistent tenant

    expect(response.body).toHaveProperty('error');
  });

  test('should handle restore with missing parameters', async () => {
    const response = await request(app)
      .post('/api/backups/restore')
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Tenant-ID', testTenant.tenantId)
      .send({
        // Missing backupFileName and targetFileName
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  test('should handle restore with invalid backup file', async () => {
    const response = await request(app)
      .post('/api/backups/restore')
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Tenant-ID', testTenant.tenantId)
      .send({
        backupFileName: 'nonexistent_backup.csv',
        targetFileName: 'employees.csv'
      })
      .expect(500); // Expected to fail for nonexistent backup

    expect(response.body).toHaveProperty('error');
  });

  test('should handle verify backup with missing parameters', async () => {
    const response = await request(app)
      .post('/api/backups/verify')
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Tenant-ID', testTenant.tenantId)
      .send({
        // Missing backupFileName and expectedChecksum
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  test('should handle verify backup with invalid backup file', async () => {
    const response = await request(app)
      .post('/api/backups/verify')
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Tenant-ID', testTenant.tenantId)
      .send({
        backupFileName: 'nonexistent_backup.csv',
        expectedChecksum: 'invalid_checksum'
      })
      .expect(500); // Expected to fail for nonexistent backup

    expect(response.body).toHaveProperty('error');
  });
});