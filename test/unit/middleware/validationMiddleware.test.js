const { validateEmployee, validateInteraction, validateKudos } = require('../../../src/middleware/validationMiddleware');

describe('Validation Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {}
    };
    res = {
      status: jest.fn(() => res),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('validateEmployee', () => {
    test('should call next for valid employee data', () => {
      req.body = {
        employee_id: 'emp-001',
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        department: 'Engineering',
        team: 'Backend',
        role: 'Developer'
      };
      
      validateEmployee(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    test('should return 400 for missing employee_id', () => {
      req.body = {
        name: 'John Doe',
        email: 'john@example.com'
      };
      
      validateEmployee(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 400 for invalid email', () => {
      req.body = {
        employee_id: 'emp-001',
        name: 'John Doe',
        email: 'invalid-email'
      };
      
      validateEmployee(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateInteraction', () => {
    test('should call next for valid interaction data', () => {
      req.body = {
        employee_id: 'emp-001',
        type: 'standup',
        content: 'Worked on project'
      };
      
      validateInteraction(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    test('should return 400 for missing employee_id', () => {
      req.body = {
        type: 'standup',
        content: 'Worked on project'
      };
      
      validateInteraction(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateKudos', () => {
    test('should call next for valid kudos data', () => {
      req.body = {
        from_employee_id: 'emp-001',
        to_employee_id: 'emp-002',
        message: 'Great work!'
      };
      
      validateKudos(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    test('should return 400 for missing from_employee_id', () => {
      req.body = {
        to_employee_id: 'emp-002',
        message: 'Great work!'
      };
      
      validateKudos(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });
});