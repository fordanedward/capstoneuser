import { writable } from 'svelte/store';

export interface DeactivationAlert {
  show: boolean;
  message: string;
}

export const deactivationAlert = writable<DeactivationAlert>({
  show: false,
  message: 'Your account has been deactivated by the administrator.'
});

export function showDeactivationAlert() {
  deactivationAlert.set({
    show: true,
    message: 'Your account has been deactivated by the administrator.'
  });
}

export function hideDeactivationAlert() {
  deactivationAlert.set({
    show: false,
    message: ''
  });
}
