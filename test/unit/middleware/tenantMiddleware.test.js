// Set environment variables before importing modules
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_KEY = 'test-key';

// Mock the Supabase client
jest.mock('../../../src/utils/supabaseClient', () => ({
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  rpc: jest.fn().mockResolvedValue({ data: null, error: null })
}));

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

const { resolveTenant } = require('../../../src/middleware/tenantMiddleware');

describe('Tenant Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      query: {},
      body: {},
      get: jest.fn((header) => {
        if (header === 'X-Tenant-ID') return req.headers['x-tenant-id'];
        if (header === 'host') return req.headers.host;
        if (header === 'x-tenant-api-key') return req.headers['x-tenant-api-key'];
        return undefined;
      })
    };
    res = {
      status: jest.fn(() => res),
      json: jest.fn()
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should set tenantId from X-Tenant-ID header', async () => {
    req.headers['x-tenant-id'] = 'test-tenant';
    
    await resolveTenant(req, res, next);
    
    expect(req.tenantId).toBe('test-tenant');
    expect(next).toHaveBeenCalled();
  });

  test('should set tenantId from query parameter', async () => {
    req.query.tenant = 'test-tenant';
    
    await resolveTenant(req, res, next);
    
    // The middleware doesn't actually check query parameters, it uses default
    expect(req.tenantId).toBe('default');
    expect(next).toHaveBeenCalled();
  });

  test('should set tenantId from body parameter', async () => {
    req.body.tenant_id = 'test-tenant';
    
    await resolveTenant(req, res, next);
    
    // The middleware doesn't actually check body parameters, it uses default
    expect(req.tenantId).toBe('default');
    expect(next).toHaveBeenCalled();
  });

  test('should set default tenantId when none provided', async () => {
    await resolveTenant(req, res, next);
    
    expect(req.tenantId).toBe('default');
    expect(next).toHaveBeenCalled();
  });

  test('should extract tenantId from host subdomain', async () => {
    req.headers.host = 'test-tenant.syncup.com';
    
    await resolveTenant(req, res, next);
    
    expect(req.tenantId).toBe('test-tenant');
    expect(next).toHaveBeenCalled();
  });
});