<script lang="ts" context="module">
    import { writable, type Writable } from 'svelte/store';
    
    export type PopupNotification = {
        id: string;
        type: 'chat' | 'appointment' | 'info';
        title: string;
        message: string;
        timestamp: Date;
        link?: string;
        icon?: string;
        read?: boolean;
        color?: string;
    };
    
    export const popupNotifications: Writable<PopupNotification[]> = writable<PopupNotification[]>([]);
    
    function saveToLocalStorage(notifs: PopupNotification[]) {
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
        
        popupNotifications.update(notifs => {
            const updated = [newNotification, ...notifs].slice(0, 20); // Keep last 20
            saveToLocalStorage(updated);
            return updated;
        });
        
        // Auto-hide popup after 5 seconds if not tapped
        setTimeout(() => {
            popupNotifications.update(notifs => {
                const notif = notifs.find(n => n.id === newNotification.id);
                // Only hide if not read (meaning it wasn't tapped)
                if (notif && !notif.read) {
                    return notifs.map(n => 
                        n.id === newNotification.id ? {...n, read: true} : n
                    );
                }
                return notifs;
            });
        }, 5000);
    }
</script>

<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { fly, fade } from 'svelte/transition';
    import { browser } from '$app/environment';
    import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
    import { initializeApp, getApps, getApp } from 'firebase/app';
    import { getFirestore, collection, query, where, onSnapshot, doc, getDoc, orderBy, type Unsubscribe } from 'firebase/firestore';
    import { firebaseConfig } from '$lib/firebaseConfig';
    import { formatRelativeTime } from '$lib/utils/timeFormat';
    
    let notifications: PopupNotification[] = [];
    let isDropdownOpen = false;
    let unreadCount = 0;
    let isLoading = true;
    let timeoutMap = new Map<string, NodeJS.Timeout>();
    let processedNotifications = new Set<string>();
    let toastNotifications: PopupNotification[] = [];
    
    let auth: ReturnType<typeof getAuth> | null = null;
    let db: ReturnType<typeof getFirestore> | null = null;
    let unsubAppointments: Unsubscribe | null = null;
    let unsubUserDoc: Unsubscribe | null = null;
    let unsubChat: Unsubscribe | null = null;
    let unsubAuth: Unsubscribe | null = null;
    let lastProcessedMessageId: string | null = null;
    let isFirstAppointmentLoad = true;
    let seenAppointmentStatuses = new Set<string>();
    let currentUserId: string | null = null;
    
    popupNotifications.subscribe(value => {
        notifications = value;
        unreadCount = value.filter(n => !n.read).length;
        
        // Update toast notifications - only unread ones
        toastNotifications = value.filter(n => !n.read).slice(0, 3);
        
        // Set timeout for any unread notifications that haven't been processed yet
        value.forEach(notif => {
            if (!notif.read && !processedNotifications.has(notif.id)) {
                processedNotifications.add(notif.id);
                
                // Set the auto-hide timeout
                const timeout = setTimeout(() => {
                    popupNotifications.update(notifs => {
                        const notification = notifs.find(n => n.id === notif.id);
                        // Only hide if still not read (meaning it wasn't tapped)
                        if (notification && !notification.read) {
                            return notifs.map(n => 
                                n.id === notif.id ? {...n, read: true} : n
                            );
                        }
                        return notifs;
                    });
                    timeoutMap.delete(notif.id);
                }, 5000);
                
                timeoutMap.set(notif.id, timeout);
            }
            
            // Clean up tracking if notification was marked as read by user
            if (notif.read && processedNotifications.has(notif.id)) {
                const timeout = timeoutMap.get(notif.id);
                if (timeout) {
                    clearTimeout(timeout);
                    timeoutMap.delete(notif.id);
                }
                processedNotifications.delete(notif.id);
            }
        });
    });
    
    function pushOrReplace(notif: PopupNotification) {
        popupNotifications.update(notifs => {
            const idx = notifs.findIndex(n => n.id === notif.id);
            if (idx >= 0) {
                notifs[idx] = notif;
            } else {
                notifs = [notif, ...notifs];
            }
            notifs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            saveToLocalStorage(notifs);
            return notifs;
        });
    }
    
    function buildAppointmentNotifs(appt: any, apptId: string): PopupNotification[] {
        const items: PopupNotification[] = [];
        const created = appt.createdAt ? new Date(appt.createdAt.seconds ? appt.createdAt.seconds * 1000 : appt.createdAt) : new Date();

        const status: string = appt.status || '';
        const canc: string = appt.cancellationStatus || '';

        if (status === 'Accepted' || status === 'confirmed') {
            items.push({ 
                id: `appt-${apptId}-accepted`, 
                timestamp: created, 
                icon: 'fa-check-circle', 
                color: '#16a34a',
                type: 'appointment',
                title: 'Appointment Accepted',
                message: `Appointment on ${appt.date} at ${appt.time} has been accepted.`,
                read: false
            });
        }
        if (status === 'Decline') {
            items.push({ 
                id: `appt-${apptId}-rejected`, 
                timestamp: created, 
                icon: 'fa-times-circle', 
                color: '#dc2626',
                type: 'appointment',
                title: 'Appointment Declined',
                message: `Appointment on ${appt.date} at ${appt.time} was declined.`,
                read: false
            });
        }
        if (status === 'Rescheduled') {
            items.push({ 
                id: `appt-${apptId}-rescheduled`, 
                timestamp: created, 
                icon: 'fa-exchange-alt', 
                color: '#7c3aed',
                type: 'appointment',
                title: 'Appointment Rescheduled',
                message: `Appointment reschedule approved to ${appt.requestedDate || appt.date} at ${appt.requestedTime || appt.time}.`,
                read: false
            });
        }
        if (canc === 'Approved') {
            items.push({ 
                id: `appt-${apptId}-cancel-approved`, 
                timestamp: created, 
                icon: 'fa-ban', 
                color: '#0ea5e9',
                type: 'appointment',
                title: 'Cancellation Approved',
                message: `Your cancellation request was approved for ${appt.date} ${appt.time}.`,
                read: false
            });
        }
        if (canc === 'decline') {
            items.push({ 
                id: `appt-${apptId}-cancel-rejected`, 
                timestamp: created, 
                icon: 'fa-exclamation-circle', 
                color: '#ca8a04',
                type: 'appointment',
                title: 'Cancellation Declined',
                message: `Your cancellation request was declined for ${appt.date} ${appt.time}.`,
                read: false
            });
        }
        if (status === 'Completed') {
            items.push({ 
                id: `appt-${apptId}-completed`, 
                timestamp: created, 
                icon: 'fa-check-double', 
                color: '#2563eb',
                type: 'appointment',
                title: 'Appointment Completed',
                message: `Appointment on ${appt.date} at ${appt.time} is completed.`,
                read: false
            });
        }
        return items;
    }

    function buildAccountNotifs(userData: any, uid: string): PopupNotification[] {
        const items: PopupNotification[] = [];
        const archived = userData?.archived === true || userData?.isArchived === true;
        if (archived) {
            items.push({ 
                id: `acct-${uid}-archived`, 
                timestamp: new Date(), 
                icon: 'fa-archive', 
                color: '#6b7280',
                type: 'info',
                title: 'Account Archived',
                message: 'Your account has been archived.',
                read: false
            });
        }
        return items;
    }
    
    function toggleDropdown() {
        isDropdownOpen = !isDropdownOpen;
        if (isDropdownOpen) {
            markAllAsRead();
        }
    }
    
    function markAllAsRead() {
        popupNotifications.update(notifs => {
            const updated = notifs.map(n => ({...n, read: true}));
            saveToLocalStorage(updated);
            return updated;
        });
    }
    
    function clearAll() {
        popupNotifications.set([]);
        localStorage.removeItem('popupNotifications');
    }
    
    function removeNotification(id: string) {
        popupNotifications.update(notifs => {
            const updated = notifs.filter(n => n.id !== id);
            saveToLocalStorage(updated);
            return updated;
        });
    }
    
    function loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('popupNotifications');
            if (saved) {
                const parsed = JSON.parse(saved);
                popupNotifications.set(parsed.map((n: any) => ({
                    ...n,
                    timestamp: new Date(n.timestamp)
                })));
            }
        } catch (e) {
            console.error('Failed to load notifications:', e);
        }
    }
    
    function getTimeAgo(date: Date): string {
        return formatRelativeTime(date);
    }
    
    function getIcon(type: string, customIcon?: string): string {
        if (customIcon) return `fas ${customIcon}`;
        switch (type) {
            case 'chat': return 'fas fa-comment-dots';
            case 'appointment': return 'fas fa-calendar-check';
            default: return 'fas fa-bell';
        }
    }
    
    function handleNotificationClick(notification: PopupNotification) {
        if (notification.link) {
            window.location.href = notification.link;
        }
        removeNotification(notification.id);
    }
    
    onMount(() => {
        if (!browser) return;
        
        loadFromLocalStorage();
        
        // Initialize Firebase
        try {
            const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
            auth = getAuth(app);
            db = getFirestore(app);
        } catch (e) {
            console.error('Failed to init Firebase for notifications:', e);
            isLoading = false;
            return;
        }
        
        // Listen for auth changes
        unsubAuth = onAuthStateChanged(auth!, async (user: User | null) => {
            isLoading = true;
            
            // If user changed (new login), clear old notifications
            if (user && currentUserId && currentUserId !== user.uid) {
                popupNotifications.set([]);
                localStorage.removeItem('popupNotifications');
            }
            
            // Update current user ID
            if (user) {
                currentUserId = user.uid;
            } else {
                currentUserId = null;
                popupNotifications.set([]);
                localStorage.removeItem('popupNotifications');
            }
            
            // Reset tracking for new login
            isFirstAppointmentLoad = true;
            seenAppointmentStatuses.clear();
            
            // Clean up previous listeners
            if (unsubAppointments) { unsubAppointments(); unsubAppointments = null; }
            if (unsubUserDoc) { unsubUserDoc(); unsubUserDoc = null; }
            if (unsubChat) { unsubChat(); unsubChat = null; }

            if (!user || !db) { 
                isLoading = false; 
                return; 
            }

            // Appointments listener
            const apptQuery = query(collection(db, 'appointments'), where('patientId', '==', user.uid));
            unsubAppointments = onSnapshot(apptQuery, (snap) => {
                // On first load, only track existing appointments without showing notifications
                if (isFirstAppointmentLoad) {
                    snap.forEach((d) => {
                        const appt = d.data();
                        const statusKey = `${d.id}_${appt.status}_${appt.cancellationStatus}`;
                        seenAppointmentStatuses.add(statusKey);
                    });
                    isFirstAppointmentLoad = false;
                    isLoading = false;
                    return;
                }

                // On subsequent updates, only process changed documents
                snap.docChanges().forEach((change) => {
                    if (change.type === 'modified') {
                        const appt = change.doc.data();
                        const statusKey = `${change.doc.id}_${appt.status}_${appt.cancellationStatus}`;
                        
                        // Only show notification if this status combination is new
                        if (!seenAppointmentStatuses.has(statusKey)) {
                            seenAppointmentStatuses.add(statusKey);
                            const notifs = buildAppointmentNotifs(appt, change.doc.id);
                            notifs.forEach(pushOrReplace);
                        }
                    }
                });
            }, (error) => {
                console.error('Notifications appointments listener error:', error);
                isLoading = false;
            });

            // Chat messages listener - only show notifications for admin messages
            const chatMessagesRef = collection(db, 'chats', user.uid, 'messages');
            const chatQuery = query(chatMessagesRef, orderBy('timestamp', 'desc'));
            unsubChat = onSnapshot(chatQuery, (snap) => {
                // Only process new messages after initial load
                if (!snap.metadata.hasPendingWrites) {
                    snap.docChanges().forEach((change) => {
                        if (change.type === 'added') {
                            const msg = change.doc.data();
                            const msgId = change.doc.id;
                            
                            // Only show notification for admin messages
                            if (msg.senderRole === 'admin' && msgId !== lastProcessedMessageId) {
                                // Check if user is not currently on the chat page
                                const isOnChatPage = window.location.pathname.includes('/auth/chat');
                                
                                if (!isOnChatPage) {
                                    lastProcessedMessageId = msgId;
                                    
                                    const chatNotif: PopupNotification = {
                                        id: `chat-${msgId}`,
                                        type: 'chat',
                                        title: `New message from ${msg.senderName || 'Admin'}`,
                                        message: msg.message.length > 100 ? msg.message.substring(0, 100) + '...' : msg.message,
                                        timestamp: msg.timestamp?.toDate ? msg.timestamp.toDate() : new Date(),
                                        link: '/auth/chat',
                                        icon: 'fa-comment-dots',
                                        color: '#1e3a66',
                                        read: false
                                    };
                                    
                                    pushOrReplace(chatNotif);
                                }
                            }
                        }
                    });
                }
            }, (error) => {
                console.error('Notifications chat listener error:', error);
            });

            // Account archival listener
            const userRef = doc(db, 'users', user.uid);
            unsubUserDoc = onSnapshot(userRef, async (docSnap) => {
                if (docSnap.exists()) {
                    const items = buildAccountNotifs(docSnap.data(), user.uid);
                    items.forEach(pushOrReplace);
                } else {
                    const profileRef = doc(db!, 'patientProfiles', user.uid);
                    const profileDoc = await getDoc(profileRef);
                    if (profileDoc.exists()) {
                        const items = buildAccountNotifs(profileDoc.data(), user.uid);
                        items.forEach(pushOrReplace);
                    }
                }
            }, (error) => {
                console.error('Notifications user listener error:', error);
            });
        });
        
        // Close dropdown when clicking outside
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.notification-container')) {
                isDropdownOpen = false;
            }
        };
        
        document.addEventListener('click', handleClickOutside);
        
        return () => {
            document.removeEventListener('click', handleClickOutside);
            // Clear all pending timeouts
            timeoutMap.forEach(timeout => clearTimeout(timeout));
            timeoutMap.clear();
            if (unsubAuth) unsubAuth();
            if (unsubAppointments) unsubAppointments();
            if (unsubUserDoc) unsubUserDoc();
            if (unsubChat) unsubChat();
        };
    });
</script>

<div class="notification-container">
    <!-- Bell Icon -->
    <button 
        class="notification-bell" 
        on:click={toggleDropdown}
        aria-label="Notifications"
    >
        <i class="fas fa-bell"></i>
        {#if unreadCount > 0}
            <span class="badge" transition:fade>
                {unreadCount > 99 ? '99+' : unreadCount}
            </span>
        {/if}
    </button>
    
    <!-- Popup Toast Notifications (Top Right) -->
    <div class="toast-container">
        {#each toastNotifications as notification (notification.id)}
            <div 
                class="toast"
                role="button"
                tabindex="0"
                style="border-left-color: {notification.color || '#3b82f6'}"
                in:fly={{ x: 300, duration: 300 }}
                out:fly={{ x: 300, duration: 200 }}
                on:click={() => handleNotificationClick(notification)}
                on:keydown={(e) => e.key === 'Enter' && handleNotificationClick(notification)}
            >
                <div class="toast-icon" style="background: {notification.color}15; color: {notification.color}">
                    <i class={getIcon(notification.type, notification.icon)}></i>
                </div>
                <div class="toast-content">
                    <div class="toast-header">
                        <div class="toast-title">{notification.title}</div>
                        <div class="toast-time">{getTimeAgo(notification.timestamp)}</div>
                    </div>
                    <div class="toast-message">{notification.message}</div>
                </div>
                <button 
                    class="toast-close"
                    on:click|stopPropagation={() => removeNotification(notification.id)}
                    aria-label="Dismiss"
                >
                    <i class="fas fa-times"></i>
                </button>
            </div>
        {/each}
    </div>
    
    <!-- Dropdown Panel -->
    {#if isDropdownOpen}
        <div 
            class="notification-dropdown"
            transition:fly={{ y: -10, duration: 200 }}
        >
            <div class="dropdown-header">
                <h3>Notifications</h3>
                {#if notifications.length > 0}
                    <button class="clear-btn" on:click={clearAll}>
                        Clear All
                    </button>
                {/if}
            </div>
            
            <div class="dropdown-content">
                {#if isLoading}
                    <div class="loading-state">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>Loading notifications...</span>
                    </div>
                {:else if notifications.length === 0}
                    <div class="empty-state">
                        <i class="fas fa-bell-slash"></i>
                        <p class="empty-title">No notifications yet</p>
                        <p class="empty-subtitle">We'll notify you when something arrives</p>
                    </div>
                {:else}
                    {#each notifications as notification (notification.id)}
                        <div 
                            class="notification-item {notification.read ? 'read' : 'unread'}"
                            role="button"
                            tabindex="0"
                            on:click={() => handleNotificationClick(notification)}
                            on:keydown={(e) => e.key === 'Enter' && handleNotificationClick(notification)}
                        >
                            <div class="item-icon" style="background: {notification.color}15; color: {notification.color}">
                                <i class={getIcon(notification.type, notification.icon)}></i>
                            </div>
                            <div class="item-content">
                                <div class="item-title">{notification.title}</div>
                                <div class="item-message">{notification.message}</div>
                                <div class="item-time">
                                    <i class="far fa-clock"></i>
                                    {getTimeAgo(notification.timestamp)}
                                </div>
                            </div>
                            <button 
                                class="item-remove"
                                on:click|stopPropagation={() => removeNotification(notification.id)}
                                aria-label="Remove"
                            >
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    {/each}
                {/if}
            </div>
        </div>
    {/if}
</div>

<style>
    .notification-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
    }
    
    /* Adjust position for auth layout pages */
    @media (min-width: 768px) {
        .notification-container {
            top: 30px;
            right: 30px;
        }
    }
    
    @media (max-width: 767px) {
        .notification-container {
            top: 4px; /* Upper position for mobile */
            left: 50%; /* Center horizontally */
            right: auto;
            transform: translateX(-50%);
        }
    }
    
    .notification-bell {
        position: relative;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: linear-gradient(135deg, #1e3a66 0%, #2d5a9f 100%);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(30, 58, 102, 0.3);
        transition: all 0.3s ease;
    }
    
    .notification-bell:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(30, 58, 102, 0.4);
    }
    
    .notification-bell i {
        color: white;
        font-size: 20px;
    }
    
    .badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: #ef4444;
        color: white;
        font-size: 11px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 12px;
        min-width: 20px;
        text-align: center;
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
    }
    
    /* Toast Notifications */
    .toast-container {
        position: fixed;
        top: 80px;
        right: 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        z-index: 9998;
        max-width: 380px;
    }
    
    .toast {
        background: white;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: flex-start;
        gap: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
        border-left: 4px solid;
        min-width: 320px;
    }
    
    .toast:hover {
        transform: translateX(-4px);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
    }
    
    .toast-icon {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    
    .toast-icon i {
        font-size: 18px;
    }
    
    .toast-content {
        flex: 1;
        min-width: 0;
    }
    
    .toast-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
    }
    
    .toast-title {
        font-weight: 600;
        font-size: 14px;
        color: #1f2937;
        flex: 1;
        min-width: 0;
    }
    
    .toast-time {
        font-size: 11px;
        color: #9ca3af;
        white-space: nowrap;
    }

    .toast-message {
        font-size: 13px;
        color: #6b7280;
        line-height: 1.4;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
    }
    
    .toast-close {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: transparent;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #9ca3af;
        transition: all 0.2s ease;
        flex-shrink: 0;
    }
    
    .toast-close:hover {
        background: #f3f4f6;
        color: #1f2937;
    }
    
    /* Dropdown Panel */
    .notification-dropdown {
        position: absolute;
        top: 60px;
        right: 0;
        width: 400px;
        max-height: 600px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 12px 48px rgba(0, 0, 0, 0.2);
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }
    
    .dropdown-header {
        padding: 16px 20px;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
    }
    
    .dropdown-header h3 {
        font-size: 18px;
        font-weight: 700;
        color: #1f2937;
        margin: 0;
    }
    
    .clear-btn {
        background: transparent;
        border: none;
        color: #3b82f6;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 6px;
        transition: all 0.2s ease;
    }
    
    .clear-btn:hover {
        background: rgba(59, 130, 246, 0.1);
    }
    
    .dropdown-content {
        overflow-y: auto;
        max-height: 540px;
    }
    
    .dropdown-content::-webkit-scrollbar {
        width: 8px;
    }
    
    .dropdown-content::-webkit-scrollbar-track {
        background: #f9fafb;
    }
    
    .dropdown-content::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 4px;
    }
    
    .dropdown-content::-webkit-scrollbar-thumb:hover {
        background: #9ca3af;
    }
    
    .empty-state {
        padding: 60px 20px;
        text-align: center;
        color: #9ca3af;
    }
    
    .empty-state i {
        font-size: 48px;
        margin-bottom: 12px;
        opacity: 0.5;
    }
    
    .empty-title {
        margin: 0 0 8px 0;
        font-size: 16px;
        font-weight: 600;
        color: #374151;
    }
    
    .empty-subtitle {
        margin: 0;
        font-size: 14px;
        color: #9ca3af;
    }
    
    .loading-state {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 40px 20px;
        color: #6b7280;
        font-size: 14px;
    }
    
    .loading-state i {
        font-size: 20px;
    }
    
    .notification-item {
        padding: 16px 20px;
        border-bottom: 1px solid #f3f4f6;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    
    .notification-item:last-child {
        border-bottom: none;
    }
    
    .notification-item.unread {
        background: rgba(59, 130, 246, 0.05);
    }
    
    .notification-item:hover {
        background: #f9fafb;
    }
    
    .item-icon {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    
    .item-icon i {
        font-size: 18px;
    }
    
    .item-content {
        flex: 1;
        min-width: 0;
    }
    
    .item-title {
        font-weight: 600;
        font-size: 14px;
        color: #1f2937;
        margin-bottom: 4px;
    }
    .item-message {
        font-size: 13px;
        color: #6b7280;
        line-height: 1.4;
        margin-bottom: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
    }
    
    .item-time {
        font-size: 12px;
        color: #9ca3af;
        display: flex;
        align-items: center;
        gap: 4px;
    }
    
    .item-time i {
        font-size: 11px;
    }
    
    .item-remove {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: transparent;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #9ca3af;
        transition: all 0.2s ease;
        flex-shrink: 0;
        opacity: 0;
    }
    
    .notification-item:hover .item-remove {
        opacity: 1;
    }
    
    .item-remove:hover {
        background: #fee2e2;
        color: #ef4444;
    }
    
    /* Mobile Responsive */
    @media (max-width: 640px) {
        .notification-container {
            top: 6px; /* Upper position for mobile */
            left: 50%; /* Center horizontally */
            right: auto;
            transform: translateX(-50%);
        }
        
        .notification-bell {
            width: 44px;
            height: 44px;
        }
        
        .toast-container {
            top: 60px;
            left: 50%;
            right: auto;
            transform: translateX(-50%);
            max-width: calc(100vw - 20px);
        }
        
        .toast {
            min-width: 280px;
            padding: 12px;
        }
        
        .notification-dropdown {
            width: calc(100vw - 20px);
            max-width: 400px;
            left: 50%;
            right: auto;
            transform: translateX(-50%);
        }
    }
</style>
