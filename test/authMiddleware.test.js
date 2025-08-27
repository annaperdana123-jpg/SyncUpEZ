// Mock the Supabase client
jest.mock('../src/utils/supabaseClient', () => ({
  auth: {
    getUser: jest.fn()
  }
}));

const { authenticateToken } = require('../src/middleware/authMiddleware');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {}
    };
    res = {
      status: jest.fn(() => res),
      json: jest.fn()
    };
    next = jest.fn();
    
    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    test('should return 401 if no token provided', async () => {
      await authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 if token is invalid', async () => {
      req.headers.authorization = 'Bearer invalid-token';
      
      // Mock Supabase auth to return an error
      require('../src/utils/supabaseClient').auth.getUser.mockResolvedValueOnce({
        data: null,
        error: new Error('Invalid token')
      });
      
      await authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should call next if token is valid', async () => {
      req.headers.authorization = 'Bearer valid-token';
      req.tenantId = 'test-tenant';
      
      // Mock Supabase auth to return a valid user
      require('../src/utils/supabaseClient').auth.getUser.mockResolvedValueOnce({
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
      });
      
      await authenticateToken(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('user-id');
    });

    test('should return 403 if tenant mismatch', async () => {
      req.headers.authorization = 'Bearer valid-token';
      req.tenantId = 'different-tenant';
      
      // Mock Supabase auth to return a user with different tenant
      require('../src/utils/supabaseClient').auth.getUser.mockResolvedValueOnce({
        data: {
          user: {
            id: 'user-id',
            email: 'test@example.com',
            user_metadata: {
              tenant_id: 'user-tenant'
            }
          }
        },
        error: null
      });
      
      await authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access denied: Tenant mismatch' });
      expect(next).not.toHaveBeenCalled();
    });
  });
});