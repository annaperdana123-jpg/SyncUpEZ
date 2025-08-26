const {
  validateEmployeeId,
  validateInteraction,
  validateKudos,
  validateContributionScores,
  validateDate
} = require('../src/middleware/validationMiddleware');

describe('Validation Middleware', () => {
  // Mock request and response objects
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn(() => res),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('validateEmployeeId', () => {
    test('should call next for valid employee ID', () => {
      req.params = { id: 'emp123' };
      validateEmployeeId(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('should return 400 for invalid employee ID', () => {
      req.params = { id: '' };
      validateEmployeeId(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid employee ID format' });
    });
  });

  describe('validateInteraction', () => {
    test('should call next for valid interaction data', () => {
      req.body = {
        employee_id: 'emp123',
        type: 'standup',
        content: 'Daily standup meeting'
      };
      validateInteraction(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('should return 400 for missing employee_id', () => {
      req.body = {
        type: 'standup',
        content: 'Daily standup meeting'
      };
      validateInteraction(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Employee ID is required' });
    });
  });

  describe('validateKudos', () => {
    test('should call next for valid kudos data', () => {
      req.body = {
        from_employee_id: 'emp123',
        to_employee_id: 'emp456',
        message: 'Great work!'
      };
      validateKudos(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('should return 400 for missing from_employee_id', () => {
      req.body = {
        to_employee_id: 'emp456',
        message: 'Great work!'
      };
      validateKudos(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'From employee ID is required' });
    });

    test('should return 400 for self-kudos', () => {
      req.body = {
        from_employee_id: 'emp123',
        to_employee_id: 'emp123',
        message: 'Great work!'
      };
      validateKudos(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Cannot give kudos to yourself' });
    });
  });

  describe('validateContributionScores', () => {
    test('should call next for valid contribution scores', () => {
      req.body = {
        employee_id: 'emp123',
        problem_solving_score: 80,
        collaboration_score: 70
      };
      validateContributionScores(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('should return 400 for invalid score range', () => {
      req.body = {
        employee_id: 'emp123',
        problem_solving_score: 150
      };
      validateContributionScores(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateDate', () => {
    test('should call next for valid date or no date', () => {
      req.params = {};
      validateDate(req, res, next);
      expect(next).toHaveBeenCalled();
      
      next.mockClear();
      
      req.params = { date: '2023-01-01' };
      validateDate(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('should return 400 for invalid date format', () => {
      req.params = { date: 'invalid-date' };
      validateDate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid date format. Use YYYY-MM-DD' });
    });
  });
});