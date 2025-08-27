/**
 * Test Data Factory
 * Provides consistent mock data generation for testing
 */

/**
 * Generate a unique timestamp for test isolation
 * @returns {number} - Current timestamp
 */
function generateTimestamp() {
  return Date.now();
}

/**
 * Create a mock employee with unique identifiers
 * @param {Object} overrides - Properties to override in the mock employee
 * @returns {Object} - Mock employee object
 */
function createMockEmployee(overrides = {}) {
  const timestamp = generateTimestamp();
  return {
    employee_id: `emp_test_${timestamp}`,
    name: 'Test User',
    email: `test${timestamp}@example.com`,
    // Removed password as it's handled by Supabase Auth
    department: 'Engineering',
    team: 'Backend',
    role: 'Developer',
    hire_date: '2023-01-01',
    ...overrides
  };
}

/**
 * Create a mock interaction with unique identifiers
 * @param {Object} overrides - Properties to override in the mock interaction
 * @returns {Object} - Mock interaction object
 */
function createMockInteraction(overrides = {}) {
  const timestamp = generateTimestamp();
  return {
    interaction_id: `int_test_${timestamp}`,
    employee_id: `emp_test_${timestamp}`,
    type: 'standup',
    content: 'Worked on testing the application',
    date: new Date().toISOString().split('T')[0],
    ...overrides
  };
}

/**
 * Create a mock kudos with unique identifiers
 * @param {Object} overrides - Properties to override in the mock kudos
 * @returns {Object} - Mock kudos object
 */
function createMockKudos(overrides = {}) {
  const timestamp = generateTimestamp();
  return {
    kudos_id: `kudos_test_${timestamp}`,
    from_employee_id: `emp_test_${timestamp}`,
    to_employee_id: `emp_test2_${timestamp}`,
    message: 'Great work on the project!',
    date: new Date().toISOString().split('T')[0],
    ...overrides
  };
}

/**
 * Create mock contribution scores with unique identifiers
 * @param {Object} overrides - Properties to override in the mock contribution
 * @returns {Object} - Mock contribution object
 */
function createMockContribution(overrides = {}) {
  const timestamp = generateTimestamp();
  return {
    contribution_id: `contrib_test_${timestamp}`,
    employee_id: `emp_test_${timestamp}`,
    date: new Date().toISOString().split('T')[0],
    problem_solving_score: 80,
    collaboration_score: 75,
    initiative_score: 85,
    overall_score: 80,
    ...overrides
  };
}

/**
 * Create a mock tenant with unique identifiers
 * @param {Object} overrides - Properties to override in the mock tenant
 * @returns {Object} - Mock tenant object
 */
function createMockTenant(overrides = {}) {
  const timestamp = generateTimestamp();
  return {
    tenantId: `tenant_test_${timestamp}`,
    name: `Test Tenant ${timestamp}`,
    contact_email: `admin${timestamp}@testtenant.com`,
    created_at: new Date().toISOString(),
    ...overrides
  };
}

module.exports = {
  generateTimestamp,
  createMockEmployee,
  createMockInteraction,
  createMockKudos,
  createMockContribution,
  createMockTenant
};