import { makeObservable, observable, action, computed } from 'mobx';

export type AppRoute =
  | 'dashboard'
  | 'documents'
  | 'graph'
  | 'chat'
  | 'versions'
  | 'settings';

interface Breadcrumb {
  label: string;
  route: AppRoute;
}

export class AppNavigationStore {
  currentRoute: AppRoute = 'dashboard';
  previousRoute: AppRoute | null = null;
  _breadcrumbs: Breadcrumb[] = [];

  constructor() {
    makeObservable(this, {
      currentRoute: observable,
      previousRoute: observable,
      _breadcrumbs: observable,
      breadcrumbs: computed,
      navigate: action.bound,
      setBreadcrumbs: action.bound,
    });
  }

  get breadcrumbs(): Breadcrumb[] {
    return this._breadcrumbs;
  }

  navigate(route: AppRoute) {
    this.previousRoute = this.currentRoute;
    this.currentRoute = route;
  }

  setBreadcrumbs(crumbs: Breadcrumb[]) {
    this._breadcrumbs = crumbs;
  }
}
