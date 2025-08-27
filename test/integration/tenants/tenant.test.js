// Set environment variables before importing modules
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_KEY = 'test-key';

// Mock the Supabase client before importing modules
jest.mock('../../../src/utils/supabaseClient', () => ({
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  rpc: jest.fn().mockResolvedValue({ data: null, error: null })
}));

const request = require('supertest');
const app = require('../../../server');
const { createMockTenant } = require('../../testDataFactory');

describe('Tenant API', () => {
  let testTenant;

  beforeAll(() => {
    // Setup test tenant
    testTenant = createMockTenant();
  });

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('POST /api/tenants', () => {
    test('should create a new tenant', async () => {
      // Mock the Supabase chain for tenantExists (should return false for new tenant)
      const singleMock1 = jest.fn().mockResolvedValueOnce({ 
        data: null,
        error: { code: 'PGRST116' } // "no rows found"
      });
      const eqMock1 = jest.fn().mockReturnValue({ single: singleMock1 });
      const selectMock1 = jest.fn().mockReturnValue({ eq: eqMock1 });
      const fromMock1 = jest.fn().mockReturnValue({ select: selectMock1 });
      
      // Mock the Supabase chain for createTenant
      const selectMock2 = jest.fn().mockResolvedValueOnce({ 
        data: [{ 
          id: 'uuid-123',
          tenant_id: testTenant.tenantId,
          name: testTenant.name,
          description: testTenant.description,
          contact_email: testTenant.contact_email,
          created_at: testTenant.created_at
        }], 
        error: null 
      });
      const insertMock = jest.fn().mockReturnValue({ select: selectMock2 });
      const fromMock2 = jest.fn().mockReturnValue({ insert: insertMock });
      
      // Apply the mocks
      const supabase = require('../../../src/utils/supabaseClient');
      let callCount = 0;
      supabase.from.mockImplementation((table) => {
        callCount++;
        if (table === 'tenants') {
          // For the first call to tenantExists
          if (callCount <= 1) {
            return fromMock1();
          } else {
            // For the second call to createTenant
            return fromMock2();
          }
        }
        return fromMock2(); // fallback
      });

      const response = await request(app)
        .post('/api/tenants')
        .send({
          tenantId: testTenant.tenantId,
          tenantData: {
            name: testTenant.name,
            description: testTenant.description,
            contact_email: testTenant.contact_email
          }
        })
        .expect(201);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('tenantId', testTenant.tenantId);
      expect(response.body).toHaveProperty('message', 'Tenant provisioned successfully');
    });

    test('should return 400 for invalid tenant data', async () => {
      const invalidTenant = {
        tenantData: {
          name: 'Test Tenant'
        }
        // Missing required tenantId
      };
      
      await request(app)
        .post('/api/tenants')
        .send(invalidTenant)
        .expect(400);
    });
  });

  describe('GET /api/tenants', () => {
    test('should get all tenants', async () => {
      // Mock the Supabase chain for getting tenants
      const selectMock = jest.fn().mockResolvedValueOnce({ 
        data: [{ 
          id: 'uuid-123',
          tenant_id: testTenant.tenantId,
          name: testTenant.name,
          description: testTenant.description,
          contact_email: testTenant.contact_email,
          created_at: testTenant.created_at
        }], 
        error: null
      });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      const supabase = require('../../../src/utils/supabaseClient');
      supabase.from.mockImplementation(fromMock);
      
      const response = await request(app)
        .get('/api/tenants')
        .expect(200);
      
      expect(response.body).toHaveProperty('tenants');
      expect(Array.isArray(response.body.tenants)).toBe(true);
    });
  });

  describe('GET /api/tenants/:id', () => {
    test('should get tenant by ID', async () => {
      // Mock the Supabase chain for getting tenant by ID
      const singleMock = jest.fn().mockResolvedValueOnce({ 
        data: { 
          id: 'uuid-123',
          tenant_id: testTenant.tenantId,
          name: testTenant.name,
          description: testTenant.description,
          contact_email: testTenant.contact_email,
          created_at: testTenant.created_at
        }, 
        error: null 
      });
      const eqMock = jest.fn().mockReturnValue({ single: singleMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      const supabase = require('../../../src/utils/supabaseClient');
      supabase.from.mockImplementation(fromMock);
      
      const response = await request(app)
        .get(`/api/tenants/${testTenant.tenantId}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('tenantId', testTenant.tenantId);
      expect(response.body).toHaveProperty('createdAt');
    });

    test('should return 404 for non-existent tenant', async () => {
      // Mock the Supabase chain to simulate tenant not found
      const singleMock = jest.fn().mockResolvedValueOnce({ 
        data: null,
        error: { message: 'Tenant not found' }
      });
      const eqMock = jest.fn().mockReturnValue({ single: singleMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      const supabase = require('../../../src/utils/supabaseClient');
      supabase.from.mockImplementation(fromMock);
      
      await request(app)
        .get('/api/tenants/non-existent-id')
        .expect(404);
    });
  });
});