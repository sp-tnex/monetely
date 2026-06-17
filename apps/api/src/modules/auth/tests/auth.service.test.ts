import { authService } from '../auth.service';
import { userRepository } from '../../users/user.repository';

jest.mock('../../users/user.repository', () => ({
  userRepository: {
    findByEmail: jest.fn(),
    findByUsername: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
  }
}));

describe('AuthService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should throw an error if email is already in use', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue({ id: '123' });

      await expect(authService.register({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      })).rejects.toThrow('Email already in use');
    });

    it('should throw an error if username is already taken', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (userRepository.findByUsername as jest.Mock).mockResolvedValue({ id: '123' });

      await expect(authService.register({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      })).rejects.toThrow('Username already taken');
    });
  });
});
