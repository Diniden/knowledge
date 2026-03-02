import { makeObservable, observable, action } from 'mobx';
import type { VersionInfo, SpecDiff } from '@kg/shared';

export class VersionStore {
  versions: Map<string, VersionInfo[]> = new Map();
  currentDiff: SpecDiff | null = null;
  loading = false;

  constructor() {
    makeObservable(this, {
      versions: observable,
      currentDiff: observable,
      loading: observable,
      setLoading: action.bound,
      setVersions: action.bound,
      setCurrentDiff: action.bound,
    });
  }

  setLoading(loading: boolean) {
    this.loading = loading;
  }

  setVersions(specId: string, versions: VersionInfo[]) {
    this.versions.set(specId, versions);
  }

  setCurrentDiff(diff: SpecDiff | null) {
    this.currentDiff = diff;
  }
}
