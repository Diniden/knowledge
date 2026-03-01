import type { User } from './user.js';

export interface AuthPayload {
  user: User;
  accessToken: string;
}

export interface JwtPayload {
  sub: string;
  username: string;
  iat?: number;
  exp?: number;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface RegisterDto {
  username: string;
  email: string;
  displayName: string;
  password: string;
}
