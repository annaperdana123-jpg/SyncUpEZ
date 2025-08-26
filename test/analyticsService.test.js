const { 
  getEmployeeMetrics,
  getEmployeeHistory,
  getTeamMetrics,
  getDepartmentMetrics,
  getOverallStats,
  getTopContributors
} = require('../src/services/analyticsService');

// Mock the readCSV function
jest.mock('../src/utils/csvReader', () => ({
  readCSV: jest.fn((filePath) => {
    // Return mock data based on the file path
    if (filePath.includes('employees.csv')) {
      return Promise.resolve([
        { employee_id: 'emp1', name: 'John Doe', team: 'TeamA', department: 'DeptA' },
        { employee_id: 'emp2', name: 'Jane Smith', team: 'TeamA', department: 'DeptA' },
        { employee_id: 'emp3', name: 'Bob Johnson', team: 'TeamB', department: 'DeptB' }
      ]);
    }
    
    if (filePath.includes('contributions.csv')) {
      return Promise.resolve([
        { employee_id: 'emp1', date: '2023-01-01', problem_solving_score: '80', collaboration_score: '70', initiative_score: '90', overall_score: '80' },
        { employee_id: 'emp1', date: '2023-02-01', problem_solving_score: '85', collaboration_score: '75', initiative_score: '95', overall_score: '85' },
        { employee_id: 'emp2', date: '2023-01-01', problem_solving_score: '70', collaboration_score: '80', initiative_score: '75', overall_score: '75' }
      ]);
    }
    
    if (filePath.includes('interactions.csv')) {
      return Promise.resolve([
        { interaction_id: 'int1', employee_id: 'emp1', type: 'standup', content: 'Worked on project' },
        { interaction_id: 'int2', employee_id: 'emp2', type: 'project_update', content: 'Fixed bug' }
      ]);
    }
    
    if (filePath.includes('kudos.csv')) {
      return Promise.resolve([
        { kudos_id: 'k1', from_employee_id: 'emp2', to_employee_id: 'emp1', message: 'Great work!' },
        { kudos_id: 'k2', from_employee_id: 'emp3', to_employee_id: 'emp1', message: 'Thanks for help!' }
      ]);
    }
    
    return Promise.resolve([]);
  })
}));

describe('Analytics Service', () => {
  describe('getEmployeeMetrics', () => {
    test('should return employee metrics with latest scores', async () => {
      const metrics = await getEmployeeMetrics('emp1');
      
      expect(metrics).toHaveProperty('employee_id', 'emp1');
      expect(metrics).toHaveProperty('name', 'John Doe');
      expect(metrics).toHaveProperty('team', 'TeamA');
      expect(metrics).toHaveProperty('department', 'DeptA');
      expect(metrics).toHaveProperty('current_scores');
    });

    test('should handle employee with no contributions', async () => {
      const metrics = await getEmployeeMetrics('emp3');
      
      expect(metrics).toHaveProperty('employee_id', 'emp3');
    });
  });

  describe('getEmployeeHistory', () => {
    test('should return sorted historical data for employee', async () => {
      const history = await getEmployeeHistory('emp1');
      
      expect(history).toHaveLength(2);
    });
  });

  describe('getTeamMetrics', () => {
    test('should return team metrics with averages', async () => {
      const metrics = await getTeamMetrics('TeamA');
      
      expect(metrics).toHaveProperty('team_id', 'TeamA');
      expect(metrics).toHaveProperty('member_count', 2);
      expect(metrics).toHaveProperty('average_scores');
    });
  });

  describe('getDepartmentMetrics', () => {
    test('should return department metrics with averages', async () => {
      const metrics = await getDepartmentMetrics('DeptA');
      
      expect(metrics).toHaveProperty('department_id', 'DeptA');
      expect(metrics).toHaveProperty('employee_count', 2);
      expect(metrics).toHaveProperty('average_scores');
    });
  });

  describe('getOverallStats', () => {
    test('should return overall statistics', async () => {
      const stats = await getOverallStats();
      
      expect(stats).toHaveProperty('total_employees', 3);
      expect(stats).toHaveProperty('total_interactions', 2);
      expect(stats).toHaveProperty('total_kudos', 2);
      expect(stats).toHaveProperty('average_scores');
    });
  });

  describe('getTopContributors', () => {
    test('should return sorted list of top contributors', async () => {
      const topContributors = await getTopContributors();
      
      expect(topContributors).toHaveLength(3);
    });
  });
});