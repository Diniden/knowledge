import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';

import type { AuthResponse, JwtPayload } from '@shared';
import { UsersService } from '../users/users.service.js';
import type { CreateUserDto } from '../users/dto/create-user.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string) {
    const user = await this.usersService.findByUsername(username);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    return user;
  }

  async login(userId: string, username: string, email: string): Promise<AuthResponse> {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = { userId, username, email };
    const accessToken = this.jwtService.sign(payload);
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();
    return { user, accessToken };
  }

  async register(dto: CreateUserDto): Promise<AuthResponse> {
    const user = await this.usersService.create(dto);
    return this.login(user.id, user.username, user.email);
  }

  async getProfile(userId: string) {
    return this.usersService.findById(userId);
  }
}
