import { writable, get } from 'svelte/store';

export interface DeactivationAlert {
  show: boolean;
  message: string;
}

export const deactivationAlert = writable<DeactivationAlert>({
  show: false,
  message: 'Your account has been deactivated by the administrator.'
});

export function showDeactivationAlert() {
  const current = get(deactivationAlert);
  // Only update if not already showing to prevent unnecessary re-renders
  if (!current.show) {
    deactivationAlert.set({
      show: true,
      message: 'Your account has been deactivated by the administrator.'
    });
  }
}

export function hideDeactivationAlert() {
  const current = get(deactivationAlert);
  // Only update if currently showing to prevent unnecessary re-renders
  if (current.show) {
    deactivationAlert.set({
      show: false,
      message: ''
    });
  }
}

export function isAlertShowing(): boolean {
  return get(deactivationAlert).show;
}
