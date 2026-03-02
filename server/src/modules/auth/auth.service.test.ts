import { describe, test, expect, beforeEach, mock, spyOn } from 'bun:test';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import bcrypt from 'bcryptjs';

const MOCK_HASH = '$2a$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012';

function createMockUsersService() {
  return {
    findByEmailWithHash: mock(() => Promise.resolve(null)),
    findByEmail: mock(() => Promise.resolve(null)),
    findByUsername: mock(() => Promise.resolve(null)),
    findById: mock(() => Promise.resolve(null)),
    createWithHash: mock(() =>
      Promise.resolve({
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      }),
    ),
  };
}

function createMockJwtService() {
  return {
    signAsync: mock(() => Promise.resolve('mock-jwt-token')),
  };
}

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: ReturnType<typeof createMockUsersService>;
  let jwtService: ReturnType<typeof createMockJwtService>;

  beforeEach(() => {
    usersService = createMockUsersService();
    jwtService = createMockJwtService();
    authService = new AuthService(usersService as never, jwtService as never);
  });

  describe('register', () => {
    test('should hash password on registration', async () => {
      const hashSpy = spyOn(bcrypt, 'hash').mockResolvedValue(
        MOCK_HASH as never,
      );

      await authService.register({
        email: 'new@example.com',
        username: 'newuser',
        password: 'StrongP@ss1',
      });

      expect(hashSpy).toHaveBeenCalledTimes(1);
      expect(usersService.createWithHash).toHaveBeenCalledWith(
        expect.objectContaining({ passwordHash: MOCK_HASH }),
      );

      hashSpy.mockRestore();
    });

    test('should reject duplicate email', async () => {
      usersService.findByEmail.mockResolvedValue({
        id: 'existing',
        email: 'dup@example.com',
      } as never);

      await expect(
        authService.register({
          email: 'dup@example.com',
          username: 'newuser',
          password: 'StrongP@ss1',
        }),
      ).rejects.toThrow(ConflictException);
    });

    test('should reject duplicate username', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue({
        id: 'existing',
        username: 'taken',
      } as never);

      await expect(
        authService.register({
          email: 'unique@example.com',
          username: 'taken',
          password: 'StrongP@ss1',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('validateUser', () => {
    test('should validate correct password', async () => {
      const realHash = await bcrypt.hash('correct-password', 4);
      usersService.findByEmailWithHash.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        passwordHash: realHash,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      } as never);

      const result = await authService.validateUser(
        'test@example.com',
        'correct-password',
      );
      expect(result).toBeDefined();
      expect(result.id).toBe('user-1');
      expect(
        (result as Record<string, unknown>)['passwordHash'],
      ).toBeUndefined();
    });

    test('should reject invalid password', async () => {
      const realHash = await bcrypt.hash('correct-password', 4);
      usersService.findByEmailWithHash.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: realHash,
      } as never);

      await expect(
        authService.validateUser('test@example.com', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    test('should reject non-existent email with timing-safe comparison', async () => {
      usersService.findByEmailWithHash.mockResolvedValue(null);

      await expect(
        authService.validateUser('nobody@example.com', 'any-password'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    test('should generate valid JWT', async () => {
      const realHash = await bcrypt.hash('password123', 4);
      usersService.findByEmailWithHash.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        passwordHash: realHash,
      } as never);

      const result = await authService.login('test@example.com', 'password123');

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user).toBeDefined();
      expect(result.user.id).toBe('user-1');
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-1',
          email: 'test@example.com',
          username: 'testuser',
        }),
      );
    });
  });

  describe('refreshToken', () => {
    test('should reject when user not found', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(authService.refreshToken('nonexistent')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
