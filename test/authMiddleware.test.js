const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../src/middleware/authMiddleware');

// Mock the readCSV function
jest.mock('../src/utils/csvReader', () => ({
  readCSV: jest.fn()
}));

// Mock jwt
jest.mock('jsonwebtoken');

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
    jwt.verify.mockReset();
    require('../src/utils/csvReader').readCSV.mockReset();
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
      // Mock jwt.verify to throw a JsonWebTokenError
      const error = new Error('invalid token');
      error.name = 'JsonWebTokenError';
      jwt.verify.mockImplementationOnce(() => {
        throw error;
      });
      
      await authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 if token is expired', async () => {
      req.headers.authorization = 'Bearer expired-token';
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';
      jwt.verify.mockImplementationOnce(() => {
        throw error;
      });
      
      await authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token expired' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 if employee not found', async () => {
      req.headers.authorization = 'Bearer valid-token';
      jwt.verify.mockReturnValueOnce({ employee_id: 'nonexistent' });
      require('../src/utils/csvReader').readCSV.mockResolvedValueOnce([]);
      
      await authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(next).not.toHaveBeenCalled();
    });
  });
});