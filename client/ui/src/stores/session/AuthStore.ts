import { makeObservable, observable, action, computed } from 'mobx';
import type { User } from '@kg/shared';

export class AuthStore {
  user: User | null = null;
  token: string | null = null;
  isAuthenticated = false;
  loading = false;

  constructor() {
    makeObservable(this, {
      user: observable,
      token: observable,
      isAuthenticated: observable,
      loading: observable,
      currentUser: computed,
      setUser: action.bound,
      setToken: action.bound,
      setLoading: action.bound,
      logout: action.bound,
    });
  }

  get currentUser(): User | null {
    return this.user;
  }

  setUser(user: User | null) {
    this.user = user;
    this.isAuthenticated = user !== null;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  setLoading(loading: boolean) {
    this.loading = loading;
  }

  logout() {
    this.user = null;
    this.token = null;
    this.isAuthenticated = false;
  }
}
