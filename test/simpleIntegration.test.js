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

const request = require('supertest');
const app = require('../server');

describe('Simple Integration Test', () => {
  test('should return 200 for root endpoint', async () => {
    // Mock the Supabase chain for the root endpoint
    const fromMock = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ data: [], error: null }) });
    require('../src/utils/supabaseClient').from.mockImplementation(fromMock);
    
    const response = await request(app)
      .get('/')
      .expect(200);
      
    expect(response.body).toHaveProperty('message', 'SyncUpEZ Server Running');
  });
});