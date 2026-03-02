import type { VersionInfo, SpecDiff } from '@kg/shared';
import { VERSION_ROUTES } from '@kg/shared';
import { apiClient } from './client';

export const versionsApi = {
  getHistory: (specId: string) =>
    apiClient.get<VersionInfo[]>(VERSION_ROUTES.HISTORY(specId)),

  getDiff: (specId: string, fromVersion: number, toVersion: number) =>
    apiClient.get<SpecDiff>(
      `${VERSION_ROUTES.DIFF(specId)}?from=${fromVersion}&to=${toVersion}`,
    ),

  restore: (specId: string, version: number) =>
    apiClient.post(VERSION_ROUTES.RESTORE(specId, version)),
};
