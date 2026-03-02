import { Injectable, ConflictException } from '@nestjs/common';
import bcrypt from 'bcrypt';

import type { User } from '@shared';
import { generateId, nowIso } from '@shared';
import type { CreateUserDto } from './dto/create-user.dto.js';

export interface UserRecord extends User {
  passwordHash: string;
}

@Injectable()
export class UsersService {
  private readonly users = new Map<string, UserRecord>();
  private readonly byUsername = new Map<string, string>();
  private readonly byEmail = new Map<string, string>();

  async create(dto: CreateUserDto): Promise<User> {
    if (this.byUsername.has(dto.username.toLowerCase())) {
      throw new ConflictException('Username already taken');
    }
    if (this.byEmail.has(dto.email.toLowerCase())) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user: UserRecord = {
      id: generateId(),
      username: dto.username,
      email: dto.email,
      displayName: dto.displayName,
      createdAt: nowIso(),
      passwordHash,
    };

    this.users.set(user.id, user);
    this.byUsername.set(user.username.toLowerCase(), user.id);
    this.byEmail.set(user.email.toLowerCase(), user.id);

    const { passwordHash: _, ...publicUser } = user;
    return publicUser;
  }

  async findById(id: string): Promise<User | null> {
    const user = this.users.get(id);
    if (!user) return null;
    const { passwordHash: _, ...publicUser } = user;
    return publicUser;
  }

  async findByUsername(username: string): Promise<UserRecord | null> {
    const id = this.byUsername.get(username.toLowerCase());
    if (!id) return null;
    return this.users.get(id) ?? null;
  }
}
