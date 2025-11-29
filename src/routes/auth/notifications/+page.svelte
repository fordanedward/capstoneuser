<script lang="ts">
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
    import { initializeApp, getApps, getApp } from 'firebase/app';
    import { getFirestore, collection, query, where, onSnapshot, doc, getDoc, type Unsubscribe } from 'firebase/firestore';
    import Swal from 'sweetalert2';
    import '@fortawesome/fontawesome-free/css/all.css';
    import { firebaseConfig } from '$lib/firebaseConfig';
    import { formatRelativeTime } from '$lib/utils/timeFormat';

    type NotificationItem = {
        id: string;
        createdAt: Date;
        icon: string;
        color: string;
        text: string;
    };

    let auth: ReturnType<typeof getAuth> | null = null;
    let db: ReturnType<typeof getFirestore> | null = null;
    let user: User | null = null;

    let notifications: NotificationItem[] = [];
    let unsubAppointments: Unsubscribe | null = null;
    let unsubUserDoc: Unsubscribe | null = null;
    let isLoading = true;
    let currentTime = new Date();

    // Update current time every minute to refresh relative timestamps
    let timeInterval: ReturnType<typeof setInterval>;

    onMount(() => {
        timeInterval = setInterval(() => {
            currentTime = new Date();
        }, 60000); // Update every minute

        return () => {
            if (timeInterval) clearInterval(timeInterval);
        };
    });

    function pushOrReplace(notif: NotificationItem) {
        const idx = notifications.findIndex(n => n.id === notif.id);
        if (idx >= 0) {
            notifications[idx] = notif;
        } else {
            notifications = [notif, ...notifications];
        }
        // Always keep notifications sorted by most recent first
        notifications = notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    function buildAppointmentNotifs(appt: any, apptId: string): NotificationItem[] {
        const items: NotificationItem[] = [];
        const created = appt.createdAt ? new Date(appt.createdAt.seconds ? appt.createdAt.seconds * 1000 : appt.createdAt) : new Date();

        const status: string = appt.status || '';
        const canc: string = appt.cancellationStatus || '';

        if (status === 'Accepted' || status === 'confirmed') {
            items.push({ id: `appt-${apptId}-accepted`, createdAt: created, icon: 'fa-check-circle', color: '#16a34a', text: `Appointment on ${appt.date} at ${appt.time} has been accepted.` });
        }
        if (status === 'Decline') {
            items.push({ id: `appt-${apptId}-rejected`, createdAt: created, icon: 'fa-times-circle', color: '#dc2626', text: `Appointment on ${appt.date} at ${appt.time} was declined.` });
        }
        if (status === 'Rescheduled') {
            items.push({ id: `appt-${apptId}-rescheduled`, createdAt: created, icon: 'fa-exchange-alt', color: '#7c3aed', text: `Appointment reschedule approved to ${appt.requestedDate || appt.date} at ${appt.requestedTime || appt.time}.` });
        }
        if (canc === 'Approved') {
            items.push({ id: `appt-${apptId}-cancel-approved`, createdAt: created, icon: 'fa-ban', color: '#0ea5e9', text: `Your cancellation request was approved for ${appt.date} ${appt.time}.` });
        }
        if (canc === 'decline') {
            items.push({ id: `appt-${apptId}-cancel-rejected`, createdAt: created, icon: 'fa-exclamation-circle', color: '#ca8a04', text: `Your cancellation request was declined for ${appt.date} ${appt.time}.` });
        }
        if (status === 'Completed') {
            items.push({ id: `appt-${apptId}-completed`, createdAt: created, icon: 'fa-check-double', color: '#2563eb', text: `Appointment on ${appt.date} at ${appt.time} is completed.` });
        }
        return items;
    }

    function buildAccountNotifs(userData: any, uid: string): NotificationItem[] {
        const items: NotificationItem[] = [];
        const archived = userData?.archived === true || userData?.isArchived === true;
        if (archived) {
            items.push({ id: `acct-${uid}-archived`, createdAt: new Date(), icon: 'fa-archive', color: '#6b7280', text: 'Your account has been archived.' });
        }
        return items;
    }

    onMount(() => {
        if (!browser) return;
        try {
            const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
            auth = getAuth(app);
            db = getFirestore(app);
        } catch (e) {
            console.error('Failed to init Firebase for notifications:', e);
            Swal.fire('Error', 'Could not connect to notifications.', 'error');
            return;
        }

        const unsubAuth = onAuthStateChanged(auth!, async (u) => {
            isLoading = true;
            notifications = [];
            if (unsubAppointments) { unsubAppointments(); unsubAppointments = null; }
            if (unsubUserDoc) { unsubUserDoc(); unsubUserDoc = null; }

            user = u;
            if (!u || !db) { isLoading = false; return; }

            // Appointments listener
            const apptQuery = query(collection(db, 'appointments'), where('patientId', '==', u.uid));
            unsubAppointments = onSnapshot(apptQuery, (snap) => {
                snap.forEach((d) => {
                    const appt = d.data();
                    const notifs = buildAppointmentNotifs(appt, d.id);
                    notifs.forEach(pushOrReplace);
                });
                // Ensure notifications are sorted by most recent first
                notifications = notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
                isLoading = false;
            }, (error) => {
                console.error('Notifications appointments listener error:', error);
                isLoading = false;
            });

            // Account archival listener (if field exists)
            const userRef = doc(db, 'users', u.uid);
            unsubUserDoc = onSnapshot(userRef, async (docSnap) => {
                if (docSnap.exists()) {
                    const items = buildAccountNotifs(docSnap.data(), u.uid);
                    items.forEach(pushOrReplace);
                } else {
                    // some projects store patient profile in patientProfiles
                    const profileRef = doc(db!, 'patientProfiles', u.uid);
                    const profileDoc = await getDoc(profileRef);
                    if (profileDoc.exists()) {
                        const items = buildAccountNotifs(profileDoc.data(), u.uid);
                        items.forEach(pushOrReplace);
                    }
                }
            }, (error) => {
                console.error('Notifications user listener error:', error);
            });
        });

        return () => {
            if (unsubAuth) unsubAuth();
            if (unsubAppointments) unsubAppointments();
            if (unsubUserDoc) unsubUserDoc();
        };
    });
</script>

<div class="notif-container">
    <div class="header">
        <h2 class="title"><i class="fas fa-bell"></i> Notifications</h2>
        {#if notifications.length > 0}
            <span class="badge">{notifications.length}</span>
        {/if}
    </div>
    
    {#if isLoading}
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Loading notifications...</span>
        </div>
    {:else if notifications.length === 0}
        <div class="empty">
            <i class="far fa-bell bell-icon"></i>
            <p class="empty-title">No notifications yet</p>
            <p class="empty-subtitle">We'll notify you when something arrives</p>
        </div>
    {:else}
        <ul class="notif-list">
            {#each notifications as n (n.id)}
                <li class="notif-item">
                    <div class="icon-wrapper" style={`background: ${n.color}15; color: ${n.color}`}>
                        <i class={`fas ${n.icon}`}></i>
                    </div>
                    <div class="content">
                        <div class="text">{n.text}</div>
                        <div class="timestamp">
                            <i class="far fa-clock"></i>
                            {formatRelativeTime(n.createdAt)}
                        </div>
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
</div>

<style>
    .notif-container { 
        max-width: 800px;
        margin: 0 auto;
        padding: 1.5rem;
    }
    
    .header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1.5rem;
    }
    
    .title { 
        font-size: 1.75rem;
        font-weight: 700;
        color: #111827;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .badge {
        background: #3b82f6;
        color: white;
        font-size: 0.875rem;
        font-weight: 600;
        padding: 0.25rem 0.625rem;
        border-radius: 9999px;
        min-width: 1.5rem;
        text-align: center;
    }
    
    .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        padding: 3rem 1.5rem;
        color: #6b7280;
        font-size: 1rem;
    }
    
    .loading i {
        font-size: 1.5rem;
    }
    
    .empty { 
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem 1.5rem;
        text-align: center;
    }
    
    .bell-icon {
        font-size: 4rem;
        color: #d1d5db;
        margin-bottom: 1rem;
    }
    
    .empty-title {
        font-size: 1.25rem;
        font-weight: 600;
        color: #374151;
        margin: 0 0 0.5rem 0;
    }
    
    .empty-subtitle {
        font-size: 0.95rem;
        color: #9ca3af;
        margin: 0;
    }
    
    .notif-list { 
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }
    
    .notif-item { 
        display: flex;
        gap: 1rem;
        border: 1px solid #e5e7eb;
        border-radius: 0.75rem;
        background: #fff;
        padding: 1rem;
        align-items: flex-start;
        transition: all 0.2s ease;
        cursor: pointer;
    }
    
    .notif-item:hover {
        border-color: #3b82f6;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
        transform: translateY(-2px);
    }
    
    .icon-wrapper { 
        width: 48px;
        height: 48px;
        min-width: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.25rem;
        border-radius: 0.75rem;
        transition: transform 0.2s ease;
    }
    
    .notif-item:hover .icon-wrapper {
        transform: scale(1.1);
    }
    
    .content { 
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        flex: 1;
    }
    
    .text { 
        color: #1f2937;
        font-size: 0.95rem;
        line-height: 1.5;
        font-weight: 500;
    }
    
    .timestamp { 
        display: flex;
        align-items: center;
        gap: 0.375rem;
        color: #6b7280;
        font-size: 0.875rem;
    }
    
    .timestamp i {
        font-size: 0.8rem;
    }
    
    /* Dark mode styles */
    :global(.dark) .title { color: #f9fafb; }
    
    :global(.dark) .loading { color: #9ca3af; }
    
    :global(.dark) .bell-icon { color: #4b5563; }
    
    :global(.dark) .empty-title { color: #e5e7eb; }
    
    :global(.dark) .empty-subtitle { color: #6b7280; }
    
    :global(.dark) .notif-item { 
        background: #1f2937;
        border-color: #374151;
    }
    
    :global(.dark) .notif-item:hover {
        border-color: #3b82f6;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
    }
    
    :global(.dark) .text { color: #f3f4f6; }
    
    :global(.dark) .timestamp { color: #9ca3af; }
    
    /* Responsive */
    @media (max-width: 640px) {
        .notif-container {
            padding: 1rem;
        }
        
        .title {
            font-size: 1.5rem;
        }
        
        .icon-wrapper {
            width: 40px;
            height: 40px;
            min-width: 40px;
            font-size: 1rem;
        }
        
        .notif-item {
            padding: 0.875rem;
        }
        
        .text {
            font-size: 0.9rem;
        }
    }
</style>