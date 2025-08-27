const scoringService = require('../../../src/services/scoringService');

describe('Scoring Service', () => {
  describe('calculateContributionScore', () => {
    test('should calculate overall score correctly', () => {
      // Arrange
      const scores = {
        problem_solving_score: 80,
        collaboration_score: 70,
        initiative_score: 90
      };

      // Act
      const result = scoringService.calculateContributionScore(scores);

      // Assert
      expect(result).toBe(80); // Average of 80, 70, 90
    });

    test('should handle edge case with zero scores', () => {
      // Arrange
      const scores = {
        problem_solving_score: 0,
        collaboration_score: 0,
        initiative_score: 0
      };

      // Act
      const result = scoringService.calculateContributionScore(scores);

      // Assert
      expect(result).toBe(0);
    });

    test('should handle maximum scores', () => {
      // Arrange
      const scores = {
        problem_solving_score: 100,
        collaboration_score: 100,
        initiative_score: 100
      };

      // Act
      const result = scoringService.calculateContributionScore(scores);

      // Assert
      expect(result).toBe(100);
    });
  });
});