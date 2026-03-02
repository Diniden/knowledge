import { makeObservable, observable, action } from 'mobx';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
  dismissible: boolean;
}

export class NotificationStore {
  notifications: Notification[] = [];

  constructor() {
    makeObservable(this, {
      notifications: observable,
      add: action.bound,
      dismiss: action.bound,
      clear: action.bound,
      success: action.bound,
      error: action.bound,
      warning: action.bound,
      info: action.bound,
    });
  }

  add(notification: Omit<Notification, 'id'>) {
    const id = crypto.randomUUID();
    this.notifications.push({ ...notification, id });

    if (notification.duration) {
      setTimeout(() => this.dismiss(id), notification.duration);
    }
  }

  dismiss(id: string) {
    this.notifications = this.notifications.filter((n) => n.id !== id);
  }

  clear() {
    this.notifications = [];
  }

  success(message: string) {
    this.add({ type: 'success', message, duration: 3000, dismissible: true });
  }

  error(message: string) {
    this.add({ type: 'error', message, dismissible: true });
  }

  warning(message: string) {
    this.add({ type: 'warning', message, duration: 5000, dismissible: true });
  }

  info(message: string) {
    this.add({ type: 'info', message, duration: 4000, dismissible: true });
  }
}
