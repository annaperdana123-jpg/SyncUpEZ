const { 
  calculateProblemSolvingScore, 
  calculateCollaborationScore, 
  calculateInitiativeScore,
  calculateOverallScore
} = require('../src/services/scoringService');

describe('Scoring Service', () => {
  describe('calculateProblemSolvingScore', () => {
    test('should return 0 for empty content', () => {
      expect(calculateProblemSolvingScore('')).toBe(0);
      expect(calculateProblemSolvingScore(null)).toBe(0);
      expect(calculateProblemSolvingScore(undefined)).toBe(0);
    });

    test('should calculate score based on problem-solving keywords', () => {
      const content = 'I solved a problem with the database issue by debugging and fixing the error';
      const score = calculateProblemSolvingScore(content);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    test('should calculate score based on question/answer ratio', () => {
      const content = 'How can we fix this issue? I suggest we should debug the code and resolve the problem';
      const score = calculateProblemSolvingScore(content);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateCollaborationScore', () => {
    test('should return 0 for no kudos', () => {
      const score = calculateCollaborationScore([], []);
      expect(score).toBe(0);
    });

    test('should calculate score based on unique senders', () => {
      const kudos = [
        { from_employee_id: 'emp1', to_employee_id: 'emp2' },
        { from_employee_id: 'emp3', to_employee_id: 'emp2' },
        { from_employee_id: 'emp1', to_employee_id: 'emp2' } // Duplicate sender
      ];
      
      const employees = [
        { employee_id: 'emp1', team: 'TeamA', department: 'DeptA' },
        { employee_id: 'emp2', team: 'TeamB', department: 'DeptB' },
        { employee_id: 'emp3', team: 'TeamC', department: 'DeptC' }
      ];
      
      const score = calculateCollaborationScore(kudos, employees);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateInitiativeScore', () => {
    test('should return 0 for empty content', () => {
      expect(calculateInitiativeScore('')).toBe(0);
      expect(calculateInitiativeScore(null)).toBe(0);
      expect(calculateInitiativeScore(undefined)).toBe(0);
    });

    test('should calculate score based on initiative keywords', () => {
      const content = 'I have started a new project and created a proposal for the initiative';
      const score = calculateInitiativeScore(content);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    test('should calculate score based on proactive language', () => {
      const content = 'I will implement this feature and I plan to suggest improvements';
      const score = calculateInitiativeScore(content);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateOverallScore', () => {
    test('should calculate weighted average of all scores', () => {
      const overall = calculateOverallScore(80, 70, 90);
      // Expected: 80*0.4 + 70*0.3 + 90*0.3 = 32 + 21 + 27 = 80
      expect(overall).toBe(80);
    });

    test('should handle edge cases', () => {
      expect(calculateOverallScore(0, 0, 0)).toBe(0);
      expect(calculateOverallScore(100, 100, 100)).toBe(100);
    });
  });
});