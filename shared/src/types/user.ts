export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface UserProfile extends User {
  avatarUrl?: string;
  lastLogin?: string;
}
