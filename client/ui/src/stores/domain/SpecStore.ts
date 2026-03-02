import { makeObservable, observable, action, computed } from 'mobx';
import type { Spec, SpecDocument } from '@kg/shared';

export class SpecStore {
  specs: Map<string, Spec> = new Map();
  documents: Map<string, SpecDocument> = new Map();
  loading = false;
  error: string | null = null;

  constructor() {
    makeObservable(this, {
      specs: observable,
      documents: observable,
      loading: observable,
      error: observable,
      specList: computed,
      documentList: computed,
      setLoading: action.bound,
      setError: action.bound,
      setSpec: action.bound,
      removeSpec: action.bound,
      setDocument: action.bound,
    });
  }

  get specList(): Spec[] {
    return Array.from(this.specs.values());
  }

  get documentList(): SpecDocument[] {
    return Array.from(this.documents.values());
  }

  setLoading(loading: boolean) {
    this.loading = loading;
  }

  setError(error: string | null) {
    this.error = error;
  }

  setSpec(spec: Spec) {
    this.specs.set(spec.id, spec);
  }

  removeSpec(id: string) {
    this.specs.delete(id);
  }

  setDocument(doc: SpecDocument) {
    this.documents.set(doc.id, doc);
  }
}
