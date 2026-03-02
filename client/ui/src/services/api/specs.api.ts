import type { Spec, SpecDocument } from '@kg/shared';
import { SPECS_ROUTES, DOCUMENTS_ROUTES } from '@kg/shared';
import { apiClient } from './client';

export const specsApi = {
  list: () => apiClient.get<Spec[]>(SPECS_ROUTES.BASE),

  get: (id: string) => apiClient.get<Spec>(SPECS_ROUTES.BY_ID(id)),

  create: (data: Partial<Spec>) =>
    apiClient.post<Spec>(SPECS_ROUTES.BASE, data),

  update: (id: string, data: Partial<Spec>) =>
    apiClient.put<Spec>(SPECS_ROUTES.BY_ID(id), data),

  delete: (id: string) => apiClient.delete(SPECS_ROUTES.BY_ID(id)),
};

export const documentsApi = {
  list: () => apiClient.get<SpecDocument[]>(DOCUMENTS_ROUTES.BASE),

  get: (id: string) => apiClient.get<SpecDocument>(DOCUMENTS_ROUTES.BY_ID(id)),

  create: (data: Partial<SpecDocument>) =>
    apiClient.post<SpecDocument>(DOCUMENTS_ROUTES.BASE, data),

  update: (id: string, data: Partial<SpecDocument>) =>
    apiClient.put<SpecDocument>(DOCUMENTS_ROUTES.BY_ID(id), data),

  delete: (id: string) => apiClient.delete(DOCUMENTS_ROUTES.BY_ID(id)),

  getSpecs: (id: string) => apiClient.get<Spec[]>(DOCUMENTS_ROUTES.SPECS(id)),
};
