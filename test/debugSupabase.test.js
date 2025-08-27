// Set environment variables before importing modules
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_KEY = 'test-key';

// Mock the Supabase client before importing modules
jest.mock('../src/utils/supabaseClient', () => ({
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  rpc: jest.fn().mockResolvedValue({ data: null, error: null })
}));

// Reset modules to ensure the mock is applied before the app is imported
jest.resetModules();

const supabase = require('../src/utils/supabaseClient');

describe('Debug Supabase Client', () => {
  test('should mock Supabase client correctly', () => {
    // Test that the mock is working
    expect(supabase.from).toBeDefined();
    expect(typeof supabase.from).toBe('function');
    
    // Test chaining
    const result = supabase.from('test');
    expect(result).toBe(supabase);
    
    // Test that select is also a function
    expect(typeof supabase.select).toBe('function');
  });
});