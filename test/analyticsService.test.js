// Set environment variables before importing modules
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_KEY = 'test-key';

const { 
  getEmployeeMetrics,
  getEmployeeHistory,
  getTeamMetrics,
  getDepartmentMetrics,
  getOverallStats,
  getTopContributors
} = require('../src/services/analyticsService');

// Mock the repositories
jest.mock('../src/repositories/employeeRepository', () => ({
  getEmployeeById: jest.fn(),
  getEmployees: jest.fn()
}));

jest.mock('../src/repositories/contributionRepository', () => ({
  getLatestContribution: jest.fn(),
  getContributionsByEmployeeId: jest.fn(),
  getContributions: jest.fn()
}));

jest.mock('../src/repositories/interactionRepository', () => ({
  getInteractions: jest.fn()
}));

jest.mock('../src/repositories/kudosRepository', () => ({
  getKudos: jest.fn()
}));

describe('Analytics Service', () => {
  const employeeRepository = require('../src/repositories/employeeRepository');
  const contributionRepository = require('../src/repositories/contributionRepository');
  const interactionRepository = require('../src/repositories/interactionRepository');
  const kudosRepository = require('../src/repositories/kudosRepository');

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('getEmployeeMetrics', () => {
    test('should return employee metrics with latest scores', async () => {
      // Mock employee data
      employeeRepository.getEmployeeById.mockResolvedValue({
        employee_id: 'emp1',
        name: 'John Doe',
        team: 'TeamA',
        department: 'DeptA'
      });

      // Mock contribution data
      contributionRepository.getLatestContribution.mockResolvedValue({
        problem_solving_score: '80',
        collaboration_score: '70',
        initiative_score: '90',
        overall_score: '80'
      });

      const metrics = await getEmployeeMetrics('emp1', 'test-tenant');
      
      expect(metrics).toHaveProperty('employee_id', 'emp1');
      expect(metrics).toHaveProperty('name', 'John Doe');
      expect(metrics).toHaveProperty('team', 'TeamA');
      expect(metrics).toHaveProperty('department', 'DeptA');
      expect(metrics).toHaveProperty('current_scores');
      expect(employeeRepository.getEmployeeById).toHaveBeenCalledWith('test-tenant', 'emp1');
      expect(contributionRepository.getLatestContribution).toHaveBeenCalledWith('test-tenant', 'emp1');
    });

    test('should handle employee with no contributions', async () => {
      // Mock employee data
      employeeRepository.getEmployeeById.mockResolvedValue({
        employee_id: 'emp3',
        name: 'Bob Johnson',
        team: 'TeamB',
        department: 'DeptB'
      });

      // Mock no contribution data
      contributionRepository.getLatestContribution.mockResolvedValue(null);

      const metrics = await getEmployeeMetrics('emp3', 'test-tenant');
      
      expect(metrics).toHaveProperty('employee_id', 'emp3');
      expect(metrics.current_scores.problem_solving_score).toBe(0);
    });
  });

  describe('getEmployeeHistory', () => {
    test('should return sorted historical data for employee', async () => {
      // Mock contribution data
      contributionRepository.getContributionsByEmployeeId.mockResolvedValue([
        { 
          calculated_at: '2023-02-01T00:00:00Z', 
          problem_solving_score: '85', 
          collaboration_score: '75', 
          initiative_score: '95', 
          overall_score: '85' 
        },
        { 
          calculated_at: '2023-01-01T00:00:00Z', 
          problem_solving_score: '80', 
          collaboration_score: '70', 
          initiative_score: '90', 
          overall_score: '80' 
        }
      ]);

      const history = await getEmployeeHistory('emp1', 'test-tenant');
      
      expect(history).toHaveLength(2);
      // Should be sorted by date (ascending)
      expect(new Date(history[0].date).getTime()).toBeLessThan(new Date(history[1].date).getTime());
      expect(contributionRepository.getContributionsByEmployeeId).toHaveBeenCalledWith('test-tenant', 'emp1');
    });
  });

  describe('getTeamMetrics', () => {
    test('should return team metrics with averages', async () => {
      // Mock employee data
      employeeRepository.getEmployees.mockResolvedValue({
        data: [
          { employee_id: 'emp1', name: 'John Doe', team: 'TeamA', department: 'DeptA' },
          { employee_id: 'emp2', name: 'Jane Smith', team: 'TeamA', department: 'DeptA' }
        ]
      });

      // Mock contribution data
      contributionRepository.getLatestContribution
        .mockResolvedValueOnce({
          problem_solving_score: '80',
          collaboration_score: '70',
          initiative_score: '90',
          overall_score: '80'
        })
        .mockResolvedValueOnce({
          problem_solving_score: '70',
          collaboration_score: '80',
          initiative_score: '75',
          overall_score: '75'
        });

      const metrics = await getTeamMetrics('TeamA', 'test-tenant');
      
      expect(metrics).toHaveProperty('team_id', 'TeamA');
      expect(metrics).toHaveProperty('member_count', 2);
      expect(metrics).toHaveProperty('average_scores');
      expect(employeeRepository.getEmployees).toHaveBeenCalledWith('test-tenant', 1, 1000);
    });
  });

  describe('getDepartmentMetrics', () => {
    test('should return department metrics with averages', async () => {
      // Mock employee data
      employeeRepository.getEmployees.mockResolvedValue({
        data: [
          { employee_id: 'emp1', name: 'John Doe', team: 'TeamA', department: 'DeptA' },
          { employee_id: 'emp2', name: 'Jane Smith', team: 'TeamA', department: 'DeptA' }
        ]
      });

      // Mock contribution data
      contributionRepository.getLatestContribution
        .mockResolvedValueOnce({
          problem_solving_score: '80',
          collaboration_score: '70',
          initiative_score: '90',
          overall_score: '80'
        })
        .mockResolvedValueOnce({
          problem_solving_score: '70',
          collaboration_score: '80',
          initiative_score: '75',
          overall_score: '75'
        });

      const metrics = await getDepartmentMetrics('DeptA', 'test-tenant');
      
      expect(metrics).toHaveProperty('department_id', 'DeptA');
      expect(metrics).toHaveProperty('employee_count', 2);
      expect(metrics).toHaveProperty('average_scores');
      expect(employeeRepository.getEmployees).toHaveBeenCalledWith('test-tenant', 1, 1000);
    });
  });

  describe('getOverallStats', () => {
    test('should return overall statistics', async () => {
      // Mock employee data
      employeeRepository.getEmployees.mockResolvedValue({
        data: [
          { employee_id: 'emp1', name: 'John Doe', team: 'TeamA', department: 'DeptA' },
          { employee_id: 'emp2', name: 'Jane Smith', team: 'TeamA', department: 'DeptA' },
          { employee_id: 'emp3', name: 'Bob Johnson', team: 'TeamB', department: 'DeptB' }
        ]
      });

      // Mock interaction data
      interactionRepository.getInteractions.mockResolvedValue({
        data: [
          { interaction_id: 'int1', employee_id: 'emp1', type: 'standup', content: 'Worked on project' },
          { interaction_id: 'int2', employee_id: 'emp2', type: 'project_update', content: 'Fixed bug' }
        ],
        pagination: { totalCount: 2 }
      });

      // Mock kudos data
      kudosRepository.getKudos.mockResolvedValue({
        data: [
          { kudos_id: 'k1', from_employee_id: 'emp2', to_employee_id: 'emp1', message: 'Great work!' },
          { kudos_id: 'k2', from_employee_id: 'emp3', to_employee_id: 'emp1', message: 'Thanks for help!' }
        ],
        pagination: { totalCount: 2 }
      });

      // Mock contribution data
      contributionRepository.getContributions.mockResolvedValue({
        data: [
          {
            employee_id: 'emp1',
            problem_solving_score: '80',
            collaboration_score: '70',
            initiative_score: '90',
            overall_score: '80',
            calculated_at: '2023-01-01T00:00:00Z'
          },
          {
            employee_id: 'emp2',
            problem_solving_score: '70',
            collaboration_score: '80',
            initiative_score: '75',
            overall_score: '75',
            calculated_at: '2023-01-01T00:00:00Z'
          },
          {
            employee_id: 'emp3',
            problem_solving_score: '85',
            collaboration_score: '85',
            initiative_score: '85',
            overall_score: '85',
            calculated_at: '2023-01-01T00:00:00Z'
          }
        ]
      });

      const stats = await getOverallStats('test-tenant');
      
      expect(stats).toHaveProperty('total_employees', 3);
      expect(stats).toHaveProperty('total_interactions', 2);
      expect(stats).toHaveProperty('total_kudos', 2);
      expect(stats).toHaveProperty('average_scores');
      expect(employeeRepository.getEmployees).toHaveBeenCalledWith('test-tenant', 1, 1000);
      expect(interactionRepository.getInteractions).toHaveBeenCalledWith('test-tenant', 1, 10000);
      expect(kudosRepository.getKudos).toHaveBeenCalledWith('test-tenant', 1, 10000);
      expect(contributionRepository.getContributions).toHaveBeenCalledWith('test-tenant', 1, 100);
    });
  });

  describe('getTopContributors', () => {
    test('should return sorted list of top contributors', async () => {
      // Mock employee data
      employeeRepository.getEmployees.mockResolvedValue({
        data: [
          { employee_id: 'emp1', name: 'John Doe', team: 'TeamA', department: 'DeptA' },
          { employee_id: 'emp2', name: 'Jane Smith', team: 'TeamA', department: 'DeptA' },
          { employee_id: 'emp3', name: 'Bob Johnson', team: 'TeamB', department: 'DeptB' }
        ]
      });

      // Mock contribution data
      contributionRepository.getLatestContribution
        .mockResolvedValueOnce({
          problem_solving_score: '80',
          collaboration_score: '70',
          initiative_score: '90',
          overall_score: '80'
        })
        .mockResolvedValueOnce({
          problem_solving_score: '70',
          collaboration_score: '80',
          initiative_score: '75',
          overall_score: '75'
        })
        .mockResolvedValueOnce({
          problem_solving_score: '85',
          collaboration_score: '85',
          initiative_score: '85',
          overall_score: '85'
        });

      const topContributors = await getTopContributors('test-tenant');
      
      expect(topContributors).toHaveLength(3);
      expect(employeeRepository.getEmployees).toHaveBeenCalledWith('test-tenant', 1, 1000);
    });
  });
});