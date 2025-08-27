const { ensureDataIsolation } = require('../../../src/middleware/dataIsolationMiddleware');

describe('Data Isolation Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn(() => res),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('ensureDataIsolation', () => {
    test('should call next if tenantId is present', () => {
      req.tenantId = 'test-tenant';
      
      ensureDataIsolation(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    test('should return 400 if tenantId is missing', () => {
      ensureDataIsolation(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Tenant context required for data isolation' });
      expect(next).not.toHaveBeenCalled();
    });
  });
});