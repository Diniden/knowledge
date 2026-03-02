import { SpecStore, GraphStore, VersionStore, ChatStore } from './domain';
import { AuthStore } from './session';
import { UILayoutStore, AppNavigationStore, NotificationStore } from './ui';

export class RootStore {
  readonly specs = new SpecStore();
  readonly graph = new GraphStore();
  readonly versions = new VersionStore();
  readonly chat = new ChatStore();
  readonly auth = new AuthStore();
  readonly layout = new UILayoutStore();
  readonly navigation = new AppNavigationStore();
  readonly notifications = new NotificationStore();
}
