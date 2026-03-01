export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface CreateUserDto {
  username: string;
  email: string;
  displayName: string;
  password: string;
}

export interface UpdateUserDto {
  displayName?: string;
  email?: string;
}
