import { writable } from 'svelte/store';

export type NotificationType = 'info' | 'success' | 'error' | 'warning';

export type Notification = {
  id: string;
  title?: string;
  body: string;
  type?: NotificationType;
  timeout?: number; // ms
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const { subscribe, update } = writable<Notification[]>([]);

function notify(opts: { title?: string; body: string; type?: NotificationType; timeout?: number }) {
  const n: Notification = {
    id: uid(),
    title: opts.title,
    body: opts.body,
    type: opts.type || 'info',
    timeout: opts.timeout ?? 5000
  };

  update((list) => [n, ...list]);

  if (n.timeout && n.timeout > 0) {
    setTimeout(() => dismiss(n.id), n.timeout);
  }

  return n.id;
}

function dismiss(id: string) {
  update((list) => list.filter((x) => x.id !== id));
}

export const notifications = { subscribe };
export const notificationActions = { notify, dismiss };

export default notifications;
