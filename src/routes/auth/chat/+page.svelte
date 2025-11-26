<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { browser } from '$app/environment';
    import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
    import { initializeApp, getApps, getApp } from 'firebase/app';
    import { 
        getFirestore, 
        collection, 
        doc, 
        addDoc, 
        query, 
        orderBy, 
        limit, 
        onSnapshot, 
        serverTimestamp,
        updateDoc,
        getDoc,
        setDoc,
        type Unsubscribe,
        Timestamp
    } from 'firebase/firestore';
    import Swal from 'sweetalert2';
    import '@fortawesome/fontawesome-free/css/all.css';
    import { firebaseConfig } from '$lib/firebaseConfig';
    import { formatRelativeTime } from '$lib/utils/timeFormat';

    type Message = {
        id: string;
        senderId: string;
        senderName: string;
        senderRole: 'member' | 'admin';
        message: string;
        timestamp: Date;
        read: boolean;
    };

    let auth: ReturnType<typeof getAuth> | null = null;
    let db: ReturnType<typeof getFirestore> | null = null;
    let user: User | null = null;
    let userDoc: any = null;

    let messages: Message[] = [];
    let messageInput = '';
    let isLoading = true;
    let isSending = false;
    let messagesUnsub: Unsubscribe | null = null;
    let chatDocUnsub: Unsubscribe | null = null;
    let currentTime = new Date();
    let chatContainer: HTMLDivElement;

    // Update current time every minute to refresh relative timestamps
    let timeInterval: ReturnType<typeof setInterval>;

    onMount(() => {
        timeInterval = setInterval(() => {
            currentTime = new Date();
        }, 60000);

        return () => {
            if (timeInterval) clearInterval(timeInterval);
        };
    });

    async function initializeChat() {
        if (!user || !db) return;

        try {
            // Get user document to get display name
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                userDoc = userSnap.data();
            } else {
                // Try patientProfiles
                const profileRef = doc(db, 'patientProfiles', user.uid);
                const profileSnap = await getDoc(profileRef);
                if (profileSnap.exists()) {
                    userDoc = profileSnap.data();
                }
            }

            // Get or create chat document
            const chatRef = doc(db, 'chats', user.uid);
            const chatSnap = await getDoc(chatRef);

            if (!chatSnap.exists()) {
                // Create chat document
                const memberName = userDoc?.displayName || 
                    (userDoc?.name && userDoc?.lastName ? `${userDoc.name} ${userDoc.lastName}`.trim() : null) ||
                    user.displayName || 
                    user.email?.split('@')[0] || 
                    'Member';
                
                await setDoc(chatRef, {
                    memberId: user.uid,
                    memberName: memberName,
                    createdAt: serverTimestamp(),
                    lastMessage: '',
                    lastMessageTime: serverTimestamp(),
                    unreadCount: 0
                });
            }

            // Listen to messages in real-time
            const messagesRef = collection(db, 'chats', user.uid, 'messages');
            const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));
            
            messagesUnsub = onSnapshot(messagesQuery, (snapshot) => {
                messages = snapshot.docs.map(doc => {
                    const data = doc.data();
                    const timestamp = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
                    return {
                        id: doc.id,
                        senderId: data.senderId,
                        senderName: data.senderName,
                        senderRole: data.senderRole,
                        message: data.message,
                        timestamp: timestamp,
                        read: data.read || false
                    };
                });
                isLoading = false;
                
                // Scroll to bottom after messages load
                setTimeout(() => {
                    if (chatContainer) {
                        chatContainer.scrollTop = chatContainer.scrollHeight;
                    }
                }, 100);
            }, (error) => {
                console.error('Error listening to messages:', error);
                Swal.fire('Error', 'Failed to load messages. Please refresh the page.', 'error');
                isLoading = false;
            });

            // Mark messages as read when member views them
            const unreadQuery = query(messagesRef, orderBy('timestamp', 'desc'), limit(50));
            onSnapshot(unreadQuery, (snapshot) => {
                const unreadMessages = snapshot.docs
                    .filter(doc => {
                        const data = doc.data();
                        return data.senderRole === 'admin' && !data.read;
                    })
                    .map(doc => doc.ref);
                
                if (unreadMessages.length > 0) {
                    unreadMessages.forEach(msgRef => {
                        updateDoc(msgRef, { read: true });
                    });
                    
                    // Update chat unread count
                    updateDoc(chatRef, { unreadCount: 0 });
                }
            });

        } catch (error) {
            console.error('Error initializing chat:', error);
            Swal.fire('Error', 'Failed to initialize chat. Please try again.', 'error');
            isLoading = false;
        }
    }

    async function sendMessage() {
        if (!messageInput.trim() || !user || !db || isSending) return;

        const messageText = messageInput.trim();
        messageInput = '';
        isSending = true;

        try {
            const chatRef = doc(db, 'chats', user.uid);
            const messagesRef = collection(db, 'chats', user.uid, 'messages');
            
            const memberName = userDoc?.displayName || 
                (userDoc?.name && userDoc?.lastName ? `${userDoc.name} ${userDoc.lastName}`.trim() : null) ||
                user.displayName || 
                user.email?.split('@')[0] || 
                'Member';

            // Add message
            await addDoc(messagesRef, {
                senderId: user.uid,
                senderName: memberName,
                senderRole: 'member',
                message: messageText,
                timestamp: serverTimestamp(),
                read: false
            });

            // Update chat document
            await updateDoc(chatRef, {
                lastMessage: messageText,
                lastMessageTime: serverTimestamp(),
                unreadCount: 0 // Reset unread count when member sends a message
            });

            // Scroll to bottom
            setTimeout(() => {
                if (chatContainer) {
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }
            }, 100);

        } catch (error) {
            console.error('Error sending message:', error);
            Swal.fire('Error', 'Failed to send message. Please try again.', 'error');
            messageInput = messageText; // Restore message
        } finally {
            isSending = false;
        }
    }

    function handleKeyPress(event: KeyboardEvent) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    }

    onMount(() => {
        if (!browser) return;
        
        try {
            const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
            auth = getAuth(app);
            db = getFirestore(app);
        } catch (e) {
            console.error('Failed to init Firebase for chat:', e);
            Swal.fire('Error', 'Could not connect to chat service.', 'error');
            return;
        }

        const unsubAuth = onAuthStateChanged(auth!, async (u) => {
            if (messagesUnsub) {
                messagesUnsub();
                messagesUnsub = null;
            }
            if (chatDocUnsub) {
                chatDocUnsub();
                chatDocUnsub = null;
            }

            user = u;
            messages = [];
            isLoading = true;

            if (!u || !db) {
                isLoading = false;
                return;
            }

            await initializeChat();
        });

        return () => {
            if (unsubAuth) unsubAuth();
            if (messagesUnsub) messagesUnsub();
            if (chatDocUnsub) chatDocUnsub();
        };
    });

    onDestroy(() => {
        if (messagesUnsub) messagesUnsub();
        if (chatDocUnsub) chatDocUnsub();
        if (timeInterval) clearInterval(timeInterval);
    });
</script>

<div class="chat-container">
    <div class="chat-header">
        <div class="header-content">
            <i class="fas fa-comments"></i>
            <h2 class="title">Chat</h2>
        </div>
        <p class="subtitle">This will be used to chat and be informed by the administration.</p>
    </div>
    
    <div class="chat-messages" bind:this={chatContainer}>
        {#if isLoading}
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading messages...</span>
            </div>
        {:else if messages.length === 0}
            <div class="empty">
                <i class="fas fa-comment-dots empty-icon"></i>
                <p class="empty-title">No messages yet</p>
                <p class="empty-subtitle">Start a conversation with our support team</p>
            </div>
        {:else}
            {#each messages as message (message.id)}
                <div class="message-wrapper {message.senderRole === 'member' ? 'sent' : 'received'}">
                    <div class="message-bubble">
                        {#if message.senderRole === 'admin'}
                            <div class="sender-name">{message.senderName}</div>
                        {/if}
                        <div class="message-text">{message.message}</div>
                        <div class="message-time">
                            {formatRelativeTime(message.timestamp)}
                        </div>
                    </div>
                </div>
            {/each}
        {/if}
    </div>
    
    <div class="chat-input-container">
        <div class="input-wrapper">
            <textarea
                bind:value={messageInput}
                on:keydown={handleKeyPress}
                placeholder="Type your message... (Press Enter to send)"
                class="message-input"
                rows="1"
                disabled={isSending || isLoading}
            ></textarea>
            <button
                on:click={sendMessage}
                class="send-button"
                disabled={!messageInput.trim() || isSending || isLoading}
                aria-label="Send message"
            >
                {#if isSending}
                    <i class="fas fa-spinner fa-spin"></i>
                {:else}
                    <i class="fas fa-paper-plane"></i>
                {/if}
            </button>
        </div>
    </div>
</div>

<style>
    .chat-container {
        max-width: 900px;
        margin: 0 auto;
        padding: 1.5rem;
        height: calc(100vh - 120px);
        display: flex;
        flex-direction: column;
        background: #fff;
        border-radius: 0.75rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    .chat-header {
        padding-bottom: 1rem;
        border-bottom: 2px solid #e5e7eb;
        margin-bottom: 1rem;
    }
    
    .header-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.5rem;
    }
    
    .header-content i {
        font-size: 1.5rem;
        color: #1e3a66;
    }
    
    .title {
        font-size: 1.75rem;
        font-weight: 700;
        color: #111827;
        margin: 0;
    }
    
    .subtitle {
        font-size: 0.95rem;
        color: #6b7280;
        margin: 0;
        margin-left: 2.25rem;
    }
    
    .chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 1rem 0;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        min-height: 0;
    }
    
    .chat-messages::-webkit-scrollbar {
        width: 8px;
    }
    
    .chat-messages::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 4px;
    }
    
    .chat-messages::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 4px;
    }
    
    .chat-messages::-webkit-scrollbar-thumb:hover {
        background: #555;
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
        flex: 1;
    }
    
    .empty-icon {
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
    
    .message-wrapper {
        display: flex;
        width: 100%;
    }
    
    .message-wrapper.sent {
        justify-content: flex-end;
    }
    
    .message-wrapper.received {
        justify-content: flex-start;
    }
    
    .message-bubble {
        max-width: 70%;
        padding: 0.75rem 1rem;
        border-radius: 1rem;
        word-wrap: break-word;
    }
    
    .message-wrapper.sent .message-bubble {
        background: #1e3a66;
        color: white;
        border-bottom-right-radius: 0.25rem;
    }
    
    .message-wrapper.received .message-bubble {
        background: #f3f4f6;
        color: #1f2937;
        border-bottom-left-radius: 0.25rem;
    }
    
    .sender-name {
        font-size: 0.75rem;
        font-weight: 600;
        margin-bottom: 0.25rem;
        color: #1e3a66;
    }
    
    .message-text {
        font-size: 0.95rem;
        line-height: 1.5;
        margin-bottom: 0.25rem;
    }
    
    .message-time {
        font-size: 0.75rem;
        opacity: 0.7;
        margin-top: 0.25rem;
    }
    
    .chat-input-container {
        padding-top: 1rem;
        border-top: 2px solid #e5e7eb;
    }
    
    .input-wrapper {
        display: flex;
        gap: 0.75rem;
        align-items: flex-end;
    }
    
    .message-input {
        flex: 1;
        padding: 0.75rem 1rem;
        border: 2px solid #e5e7eb;
        border-radius: 0.75rem;
        font-size: 0.95rem;
        font-family: inherit;
        resize: none;
        min-height: 44px;
        max-height: 120px;
        transition: border-color 0.2s;
    }
    
    .message-input:focus {
        outline: none;
        border-color: #1e3a66;
    }
    
    .message-input:disabled {
        background: #f3f4f6;
        cursor: not-allowed;
    }
    
    .send-button {
        padding: 0.75rem 1.25rem;
        background: #1e3a66;
        color: white;
        border: none;
        border-radius: 0.75rem;
        cursor: pointer;
        font-size: 1rem;
        transition: background-color 0.2s, transform 0.1s;
        min-width: 48px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .send-button:hover:not(:disabled) {
        background: #15304d;
        transform: scale(1.05);
    }
    
    .send-button:active:not(:disabled) {
        transform: scale(0.95);
    }
    
    .send-button:disabled {
        background: #9ca3af;
        cursor: not-allowed;
        transform: none;
    }
    
    /* Responsive */
    @media (max-width: 640px) {
        .chat-container {
            padding: 1rem;
            height: calc(100vh - 100px);
        }
        
        .title {
            font-size: 1.5rem;
        }
        
        .subtitle {
            font-size: 0.875rem;
            margin-left: 2rem;
        }
        
        .message-bubble {
            max-width: 85%;
        }
        
        .message-input {
            font-size: 0.875rem;
        }
    }
</style>

