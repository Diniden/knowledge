import { Injectable } from '@nestjs/common';
import type { User } from '@kg/shared';
import { generateId, NotFoundError } from '@kg/shared';

interface UserRecord extends User {
  passwordHash: string;
}

interface CreateWithHashParams {
  email: string;
  username: string;
  displayName: string;
  passwordHash: string;
}

@Injectable()
export class UsersService {
  private users = new Map<string, UserRecord>();

  async findAll(): Promise<User[]> {
    return Array.from(this.users.values()).map(
      ({ passwordHash: _, ...user }) => user,
    );
  }

  async findById(id: string): Promise<User | null> {
    const record = this.users.get(id);
    if (!record) return null;
    const { passwordHash: _, ...user } = record;
    return user;
  }

  async findByUsername(username: string): Promise<User | null> {
    const lower = username.toLowerCase();
    for (const record of this.users.values()) {
      if (record.username.toLowerCase() === lower) {
        const { passwordHash: _, ...user } = record;
        return user;
      }
    }
    return null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const lower = email.toLowerCase();
    for (const record of this.users.values()) {
      if (record.email.toLowerCase() === lower) {
        const { passwordHash: _, ...user } = record;
        return user;
      }
    }
    return null;
  }

  async findByEmailWithHash(email: string): Promise<UserRecord | null> {
    const lower = email.toLowerCase();
    for (const record of this.users.values()) {
      if (record.email.toLowerCase() === lower) {
        return record;
      }
    }
    return null;
  }

  async create(data: {
    username: string;
    email: string;
    password: string;
    displayName: string;
  }): Promise<User> {
    return this.createWithHash({
      email: data.email,
      username: data.username,
      displayName: data.displayName,
      passwordHash: data.password,
    });
  }

  async createWithHash(data: CreateWithHashParams): Promise<User> {
    const id = `user_${generateId(16)}`;
    const now = new Date().toISOString();

    const record: UserRecord = {
      id,
      username: data.username,
      email: data.email,
      displayName: data.displayName,
      createdAt: now,
      passwordHash: data.passwordHash,
    };

    this.users.set(id, record);
    const { passwordHash: _, ...user } = record;
    return user;
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const record = this.users.get(id);
    if (!record) throw new NotFoundError('User', id);

    const updated = { ...record, ...data, id };
    this.users.set(id, updated);
    const { passwordHash: _, ...user } = updated;
    return user;
  }
}
