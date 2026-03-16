import { writable } from 'svelte/store';
import type { PopupNotification } from '$lib/types/notifications';

export const popupNotifications = writable<PopupNotification[]>([]);

export function saveToLocalStorage(notifs: PopupNotification[]) {
    try {
        localStorage.setItem('popupNotifications', JSON.stringify(notifs));
    } catch (e) {
        console.error('Failed to save notifications:', e);
    }
}

export function addNotification(notification: Omit<PopupNotification, 'id' | 'timestamp'>) {
    const newNotification: PopupNotification = {
        ...notification,
        id: Date.now().toString() + Math.random(),
        timestamp: new Date(),
        read: false
    };

    popupNotifications.update((notifs) => {
        const updated = [newNotification, ...notifs].slice(0, 50); // Keep last 50
        saveToLocalStorage(updated);
        return updated;
    });

    // Note: Auto-hide is now handled by the subscription logic
}
