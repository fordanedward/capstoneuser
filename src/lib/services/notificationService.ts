import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    onSnapshot,
    orderBy,
    limit,
    type Unsubscribe 
} from 'firebase/firestore';
import type { User } from 'firebase/auth';

export type NotificationListener = {
    unsubscribe: () => void;
};

let chatUnsubscribe: Unsubscribe | null = null;
let appointmentUnsubscribe: Unsubscribe | null = null;

// Track last seen messages and appointments to avoid duplicate notifications
const seenMessages = new Set<string>();
const seenAppointments = new Set<string>();

export function initializeNotificationListeners(
    user: User,
    db: ReturnType<typeof getFirestore>,
    onNotification: (notification: {
        type: 'chat' | 'appointment' | 'info';
        title: string;
        message: string;
        link?: string;
        icon?: string;
    }) => void
) {
    // Clean up existing listeners
    cleanup();
    
    // Clear seen items on new initialization
    seenMessages.clear();
    seenAppointments.clear();
    
    // Listen for new chat messages from admin
    const chatRef = collection(db, 'chats', user.uid, 'messages');
    const chatQuery = query(
        chatRef,
        orderBy('timestamp', 'desc'),
        limit(50)
    );
    
    let isFirstChatLoad = true;
    chatUnsubscribe = onSnapshot(chatQuery, (snapshot) => {
        if (isFirstChatLoad) {
            // On first load, mark all existing messages as seen
            snapshot.docs.forEach(doc => {
                seenMessages.add(doc.id);
            });
            isFirstChatLoad = false;
            return;
        }
        
        snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
                const data = change.doc.data();
                const messageId = change.doc.id;
                
                // Only notify for admin messages that haven't been seen
                if (data.senderRole === 'admin' && !seenMessages.has(messageId)) {
                    seenMessages.add(messageId);
                    
                    onNotification({
                        type: 'chat',
                        title: 'New Message',
                        message: data.senderName ? `${data.senderName}: ${data.message}` : data.message,
                        link: '/auth/chat',
                        icon: 'fas fa-comment-dots'
                    });
                    
                    // Play notification sound
                    playNotificationSound();
                }
            }
        });
    }, (error) => {
        console.error('Chat notification listener error:', error);
    });
    
    // Listen for appointment status changes
    const appointmentRef = collection(db, 'appointments');
    const appointmentQuery = query(
        appointmentRef,
        where('patientId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(50)
    );
    
    let isFirstAppointmentLoad = true;
    appointmentUnsubscribe = onSnapshot(appointmentQuery, (snapshot) => {
        if (isFirstAppointmentLoad) {
            // On first load, mark all existing appointments as seen
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const key = `${doc.id}_${data.status}_${data.cancellationStatus}`;
                seenAppointments.add(key);
            });
            isFirstAppointmentLoad = false;
            return;
        }
        
        snapshot.docChanges().forEach(change => {
            const data = change.doc.data();
            const appointmentId = change.doc.id;
            const statusKey = `${appointmentId}_${data.status}_${data.cancellationStatus}`;
            
            if (change.type === 'modified' && !seenAppointments.has(statusKey)) {
                seenAppointments.add(statusKey);
                
                // Notify for status changes
                if (data.status === 'Accepted' || data.status === 'confirmed') {
                    onNotification({
                        type: 'appointment',
                        title: 'Appointment Confirmed! ✅',
                        message: `Your appointment on ${data.date} at ${data.time} has been confirmed.`,
                        link: '/auth/appointment',
                        icon: 'fas fa-check-circle'
                    });
                    playNotificationSound();
                } 
                else if (data.status === 'Decline' || data.status === 'declined') {
                    onNotification({
                        type: 'appointment',
                        title: 'Appointment Declined ❌',
                        message: `Your appointment request for ${data.date} at ${data.time} was declined.`,
                        link: '/auth/appointment',
                        icon: 'fas fa-times-circle'
                    });
                    playNotificationSound();
                }
                else if (data.status === 'Rescheduled') {
                    onNotification({
                        type: 'appointment',
                        title: 'Appointment Rescheduled 📅',
                        message: `Your appointment has been rescheduled to ${data.date} at ${data.time}.`,
                        link: '/auth/appointment',
                        icon: 'fas fa-calendar-alt'
                    });
                    playNotificationSound();
                }
                else if (data.status === 'Completed') {
                    onNotification({
                        type: 'appointment',
                        title: 'Appointment Completed ✓',
                        message: `Your appointment on ${data.date} has been marked as completed.`,
                        link: '/auth/appointment',
                        icon: 'fas fa-check-double'
                    });
                    playNotificationSound();
                }
                else if (data.cancellationStatus === 'Approved') {
                    onNotification({
                        type: 'appointment',
                        title: 'Cancellation Approved',
                        message: `Your cancellation request for ${data.date} at ${data.time} has been approved.`,
                        link: '/auth/appointment',
                        icon: 'fas fa-ban'
                    });
                    playNotificationSound();
                }
                else if (data.cancellationStatus === 'decline') {
                    onNotification({
                        type: 'appointment',
                        title: 'Cancellation Declined',
                        message: `Your cancellation request was declined. Appointment on ${data.date} at ${data.time} remains scheduled.`,
                        link: '/auth/appointment',
                        icon: 'fas fa-exclamation-triangle'
                    });
                    playNotificationSound();
                }
                else if (data.paymentStatus === 'refunded') {
                    onNotification({
                        type: 'appointment',
                        title: 'Refund Processed 💰',
                        message: `Your refund of ₱${data.refundAmount?.toFixed(2) || '0.00'} has been processed.`,
                        link: '/auth/appointment',
                        icon: 'fas fa-money-bill-wave'
                    });
                    playNotificationSound();
                }
            }
        });
    }, (error) => {
        console.error('Appointment notification listener error:', error);
    });
}

export function cleanup() {
    if (chatUnsubscribe) {
        chatUnsubscribe();
        chatUnsubscribe = null;
    }
    if (appointmentUnsubscribe) {
        appointmentUnsubscribe();
        appointmentUnsubscribe = null;
    }
}

function playNotificationSound() {
    try {
        // Create a simple notification beep using Web Audio API
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Configure sound
        oscillator.frequency.value = 800; // Hz
        oscillator.type = 'sine';
        
        // Volume envelope
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
        
        // Play
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
        // Silently fail if audio context not supported
        console.debug('Notification sound not available:', e);
    }
}
