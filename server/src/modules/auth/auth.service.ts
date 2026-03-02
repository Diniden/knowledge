import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { type JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import type { AuthPayload, JwtPayload, RegisterRequest } from '@kg/shared';
import { type UsersService } from '../users/users.service.js';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const record = await this.usersService.findByEmailWithHash(
      email.toLowerCase(),
    );

    if (!record) {
      await bcrypt.hash('dummy-timing-safe', BCRYPT_ROUNDS);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, record.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { passwordHash: _, ...user } = record;
    return user;
  }

  async login(email: string, password: string): Promise<AuthPayload> {
    const user = await this.validateUser(email, password);

    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      username: user.username,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    this.logger.log(`User logged in: ${user.username}`);

    return { user, accessToken };
  }

  async register(
    data: Omit<RegisterRequest, 'displayName'> & { displayName?: string },
  ): Promise<AuthPayload> {
    const existingEmail = await this.usersService.findByEmail(
      data.email.toLowerCase(),
    );
    if (existingEmail) {
      throw new ConflictException('Email already in use');
    }

    const existingUsername = await this.usersService.findByUsername(
      data.username.toLowerCase(),
    );
    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    const user = await this.usersService.createWithHash({
      email: data.email.toLowerCase(),
      username: data.username,
      displayName: data.displayName || data.username,
      passwordHash,
    });

    this.logger.log(`User registered: ${user.username}`);

    return { user };
  }

  async getProfile(userId: string) {
    return this.usersService.findById(userId);
  }

  async refreshToken(userId: string): Promise<AuthPayload> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      username: user.username,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return { user, accessToken };
  }
}
