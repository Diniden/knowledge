import type {
  AuthPayload,
  LoginRequest,
  RegisterRequest,
  User,
} from '@kg/shared';
import { AUTH_ROUTES } from '@kg/shared';
import { apiClient } from './client';

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<AuthPayload>(AUTH_ROUTES.LOGIN, data),

  register: (data: RegisterRequest) =>
    apiClient.post<AuthPayload>(AUTH_ROUTES.REGISTER, data),

  me: () => apiClient.get<User>(AUTH_ROUTES.ME),

  refresh: () => apiClient.post<AuthPayload>(AUTH_ROUTES.REFRESH),
};
