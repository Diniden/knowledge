import type { User } from '@kg/shared';
import { USERS_ROUTES } from '@kg/shared';
import { apiClient } from './client';

export const usersApi = {
  list: () => apiClient.get<User[]>(USERS_ROUTES.BASE),

  get: (id: string) => apiClient.get<User>(USERS_ROUTES.BY_ID(id)),

  getProfile: () => apiClient.get<User>(USERS_ROUTES.PROFILE),

  updateProfile: (data: Partial<User>) =>
    apiClient.patch<User>(USERS_ROUTES.PROFILE, data),
};
