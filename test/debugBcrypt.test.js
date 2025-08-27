// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true)
}));

const bcrypt = require('bcrypt');

describe('Debug Bcrypt Mock', () => {
  test('should mock bcrypt correctly', async () => {
    const result = await bcrypt.hash('password123', 10);
    expect(result).toBe('hashed-password');
  });
});