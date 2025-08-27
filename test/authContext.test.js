// Set environment variables before importing modules
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_KEY = 'test-key';

const request = require('supertest');
const app = require('../server');
const { createMockEmployee, createMockTenant } = require('./testDataFactory');

// Mock Supabase client
jest.mock('../src/utils/supabaseClient', () => ({
  auth: {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    getUser: jest.fn()
  },
  rpc: jest.fn().mockResolvedValue({ data: null, error: null })
}));

describe('Authentication Context Tests', () => {
  let testTenant, testEmployee;

  beforeAll(() => {
    // Create mock tenant and employee
    testTenant = createMockTenant({ tenantId: 'auth_test_tenant' });
    testEmployee = createMockEmployee();
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  test('should authenticate with correct tenant context', async () => {
    // Mock Supabase auth response
    require('../src/utils/supabaseClient').auth.signInWithPassword.mockResolvedValueOnce({
      data: {
        user: {
          id: 'user-id',
          email: testEmployee.email,
          user_metadata: {
            tenant_id: testTenant.tenantId,
            employee_id: testEmployee.employee_id
          }
        },
        session: {
          access_token: 'mock-access-token'
        }
      },
      error: null
    });

    // Login to get the token
    const response = await request(app)
      .post('/api/auth/login')
      .set('X-Tenant-ID', testTenant.tenantId)
      .send({
        email: testEmployee.email,
        password: testEmployee.password
      })
      .expect(200);

    // Verify the response contains user and session
    expect(response.body).toHaveProperty('user');
    expect(response.body).toHaveProperty('session');
    expect(response.body.user.email).toBe(testEmployee.email);
  });

  test('should reject invalid credentials', async () => {
    // Mock Supabase auth to return an error
    require('../src/utils/supabaseClient').auth.signInWithPassword.mockResolvedValueOnce({
      data: null,
      error: new Error('Invalid credentials')
    });

    // Try to login with invalid credentials
    await request(app)
      .post('/api/auth/login')
      .set('X-Tenant-ID', testTenant.tenantId)
      .send({
        email: 'invalid@example.com',
        password: 'wrong-password'
      })
      .expect(401);
  });

  test('should reject tokens with mismatched tenant context', async () => {
    // Mock Supabase auth response with different tenant
    require('../src/utils/supabaseClient').auth.getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: 'user-id',
          email: testEmployee.email,
          user_metadata: {
            tenant_id: 'different-tenant',
            employee_id: testEmployee.employee_id
          }
        }
      },
      error: null
    });

    // Try to use a token with a different tenant context
    await request(app)
      .get('/api/employees')
      .set('Authorization', `Bearer mock-token`)
      .set('X-Tenant-ID', testTenant.tenantId)
      .expect(403);
  });
});