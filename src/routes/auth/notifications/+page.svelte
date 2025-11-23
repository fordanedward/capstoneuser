<script lang="ts">
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
    import { initializeApp, getApps, getApp } from 'firebase/app';
    import { getFirestore, collection, query, where, onSnapshot, doc, getDoc, type Unsubscribe } from 'firebase/firestore';
    import Swal from 'sweetalert2';
    import '@fortawesome/fontawesome-free/css/all.css';
    import { firebaseConfig } from '$lib/firebaseConfig';

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

    function pushOrReplace(notif: NotificationItem) {
        const idx = notifications.findIndex(n => n.id === notif.id);
        if (idx >= 0) {
            notifications[idx] = notif;
        } else {
            notifications = [notif, ...notifications];
        }
        notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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
    <h2 class="title"><i class="fas fa-bell mr-2"></i> Notifications</h2>
    {#if isLoading}
        <div class="loading"><i class="fas fa-spinner fa-spin mr-2"></i>Loading notifications...</div>
    {:else if notifications.length === 0}
        <div class="empty"><i class="far fa-bell"></i> No notifications yet.</div>
    {:else}
        <ul class="notif-list">
            {#each notifications as n (n.id)}
                <li class="notif-item">
                    <span class="icon" style={`color:${n.color}`}><i class={`fas ${n.icon}`}></i></span>
                    <div class="content">
                        <div class="text">{n.text}</div>
                        <div class="date">{n.createdAt.toLocaleString()}</div>
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
</div>

<style>
    .notif-container { padding: 1rem; }
    .title { font-size: 1.25rem; font-weight: 600; color: #374151; margin-bottom: 0.75rem; }
    .loading, .empty { padding: 0.75rem; border: 1px solid #e5e7eb; background: #f9fafb; color: #6b7280; border-radius: 0.5rem; }
    .notif-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
    .notif-item { display: flex; gap: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; background: #fff; padding: 0.75rem; align-items: flex-start; }
    .icon { width: 24px; display: inline-flex; align-items: center; justify-content: center; font-size: 1rem; }
    .content { display: flex; flex-direction: column; gap: 0.2rem; }
    .text { color: #374151; font-size: 0.95rem; }
    .date { color: #9ca3af; font-size: 0.8rem; }
    :global(.dark) .title { color: #f3f4f6; }
    :global(.dark) .loading, :global(.dark) .empty { background: #1f2937; color: #9ca3af; border-color: #374151; }
    :global(.dark) .notif-item { background: #1f2937; border-color: #374151; }
    :global(.dark) .text { color: #e5e7eb; }
    :global(.dark) .date { color: #9ca3af; }
</style>