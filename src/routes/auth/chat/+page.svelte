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
    let textareaElement: HTMLTextAreaElement;
    let isTyping = false;
    let typingTimeout: ReturnType<typeof setTimeout>;

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

    // Auto-resize textarea
    function autoResizeTextarea() {
        if (textareaElement && typeof textareaElement !== 'undefined') {
            textareaElement.style.height = 'auto';
            textareaElement.style.height = Math.min(textareaElement.scrollHeight, 120) + 'px';
        }
    }

    // Handle input changes
    function handleInput() {
        autoResizeTextarea();
        handleTypingIndicator();
    }

    // Typing indicator
    async function handleTypingIndicator() {
        if (!user || !db) return;

        try {
            const chatRef = doc(db, 'chats', user.uid);
            
            if (!isTyping) {
                isTyping = true;
                await updateDoc(chatRef, {
                    memberTyping: true,
                    memberTypingAt: serverTimestamp()
                });
            }

            // Clear previous timeout
            if (typingTimeout) clearTimeout(typingTimeout);

            // Set new timeout to clear typing status
            typingTimeout = setTimeout(async () => {
                isTyping = false;
                await updateDoc(chatRef, {
                    memberTyping: false
                });
            }, 3000);
        } catch (error) {
            console.error('Error updating typing status:', error);
        }
    }

    // Scroll to bottom smoothly
    function scrollToBottom(smooth = true) {
        if (chatContainer) {
            chatContainer.scrollTo({
                top: chatContainer.scrollHeight,
                behavior: smooth ? 'smooth' : 'auto'
            });
        }
    }

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
                    scrollToBottom(false);
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

        // Clear typing indicator
        if (typingTimeout) clearTimeout(typingTimeout);
        if (isTyping && db && user) {
            isTyping = false;
            const chatRef = doc(db, 'chats', user.uid);
            await updateDoc(chatRef, { memberTyping: false }).catch(console.error);
        }

        // Reset textarea height
        if (textareaElement && typeof textareaElement !== 'undefined') {
            textareaElement.style.height = 'auto';
        }

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
                scrollToBottom();
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
        if (typingTimeout) clearTimeout(typingTimeout);
        
        // Clear typing indicator on component destroy
        if (isTyping && db && user) {
            const chatRef = doc(db, 'chats', user.uid);
            updateDoc(chatRef, { memberTyping: false }).catch(console.error);
        }
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
                            <div class="sender-info">
                                <i class="fas fa-user-shield admin-icon"></i>
                                <span class="sender-name">{message.senderName}</span>
                            </div>
                        {/if}
                        <div class="message-text">{message.message}</div>
                        <div class="message-footer">
                            <span class="message-time">
                                {formatRelativeTime(message.timestamp)}
                            </span>
                            {#if message.senderRole === 'member'}
                                <span class="message-status">
                                    {#if message.read}
                                        <i class="fas fa-check-double read-icon" title="Read"></i>
                                    {:else}
                                        <i class="fas fa-check sent-icon" title="Sent"></i>
                                    {/if}
                                </span>
                            {/if}
                        </div>
                    </div>
                </div>
            {/each}
        {/if}
    </div>
    
    <div class="chat-input-container">
        <div class="input-wrapper">
            <textarea
                bind:this={textareaElement}
                bind:value={messageInput}
                on:input={handleInput}
                on:keydown={handleKeyPress}
                placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
                class="message-input"
                rows="1"
                disabled={isSending || isLoading}
            ></textarea>
            <button
                on:click={sendMessage}
                class="send-button"
                disabled={!messageInput.trim() || isSending || isLoading}
                aria-label="Send message"
                title="Send message"
            >
                {#if isSending}
                    <i class="fas fa-spinner fa-spin"></i>
                {:else}
                    <i class="fas fa-paper-plane"></i>
                {/if}
            </button>
        </div>
        <div class="input-hints">
            <span class="hint"><i class="fas fa-info-circle"></i> Enter to send • Shift+Enter for new line</span>
        </div>
    </div>
</div>

<style>
    .chat-container {
        max-width: 100%;
        margin: 0;
        padding: 0.75rem 1rem 0.5rem;
        height: calc(100vh - 80px);
        display: flex;
        flex-direction: column;
        background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
        border-radius: 0.5rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 15px rgba(0, 0, 0, 0.1);
    }
    
    .chat-header {
        padding-bottom: 0.75rem;
        border-bottom: 2px solid #e5e7eb;
        margin-bottom: 0.75rem;
        background: white;
        padding: 0.875rem;
        border-radius: 0.5rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
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
        animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
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
        padding: 0.75rem 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.875rem;
        min-height: 0;
        background: white;
        border-radius: 0.5rem;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
    }
    
    .chat-messages::-webkit-scrollbar {
        width: 10px;
    }
    
    .chat-messages::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 5px;
    }
    
    .chat-messages::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, #1e3a66 0%, #15304d 100%);
        border-radius: 5px;
        border: 2px solid #f1f5f9;
    }
    
    .chat-messages::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(180deg, #15304d 0%, #0d1f33 100%);
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
        color: #1e3a66;
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
        animation: float 3s ease-in-out infinite;
    }

    @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
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
        animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .message-wrapper.sent {
        justify-content: flex-end;
    }
    
    .message-wrapper.received {
        justify-content: flex-start;
    }
    
    .message-bubble {
        max-width: 75%;
        padding: 0.75rem 1rem;
        border-radius: 1rem;
        word-wrap: break-word;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s, box-shadow 0.2s;
    }

    .message-bubble:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }
    
    .message-wrapper.sent .message-bubble {
        background: linear-gradient(135deg, #1e3a66 0%, #15304d 100%);
        color: white;
        border-bottom-right-radius: 0.375rem;
    }
    
    .message-wrapper.received .message-bubble {
        background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
        color: #1f2937;
        border-bottom-left-radius: 0.375rem;
    }
    
    .sender-info {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.8rem;
        font-weight: 600;
        margin-bottom: 0.375rem;
        color: #1e3a66;
    }

    .admin-icon {
        font-size: 0.875rem;
        color: #1e3a66;
    }
    
    .sender-name {
        font-size: 0.8rem;
    }
    
    .message-text {
        font-size: 0.975rem;
        line-height: 1.5;
        margin-bottom: 0.375rem;
        white-space: pre-wrap;
        word-break: break-word;
    }
    
    .message-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        margin-top: 0.375rem;
    }

    .message-time {
        font-size: 0.75rem;
        opacity: 0.75;
    }

    .message-status {
        display: flex;
        align-items: center;
    }

    .message-status i {
        font-size: 0.75rem;
    }

    .read-icon {
        color: #60a5fa;
    }

    .sent-icon {
        opacity: 0.7;
    }
    
    .chat-input-container {
        padding-top: 0.5rem;
        background: white;
        border-radius: 0.5rem;
        padding: 0.75rem 0.5rem 0.5rem;
        box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.05);
    }
    
    .input-wrapper {
        display: flex;
        gap: 0.75rem;
        align-items: flex-end;
        margin-bottom: 0.5rem;
    }
    
    .message-input {
        flex: 1;
        padding: 0.875rem 1.125rem;
        border: 2px solid #e5e7eb;
        border-radius: 1rem;
        font-size: 0.975rem;
        font-family: inherit;
        resize: none;
        min-height: 48px;
        max-height: 120px;
        transition: all 0.2s;
        line-height: 1.5;
    }
    
    .message-input:focus {
        outline: none;
        border-color: #1e3a66;
        box-shadow: 0 0 0 3px rgba(30, 58, 102, 0.1);
    }
    
    .message-input:disabled {
        background: #f3f4f6;
        cursor: not-allowed;
        opacity: 0.6;
    }
    
    .send-button {
        padding: 0.875rem 1.375rem;
        background: linear-gradient(135deg, #1e3a66 0%, #15304d 100%);
        color: white;
        border: none;
        border-radius: 1rem;
        cursor: pointer;
        font-size: 1rem;
        transition: all 0.2s;
        min-width: 52px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 4px rgba(30, 58, 102, 0.3);
    }
    
    .send-button:hover:not(:disabled) {
        background: linear-gradient(135deg, #15304d 0%, #0d1f33 100%);
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(30, 58, 102, 0.4);
    }
    
    .send-button:active:not(:disabled) {
        transform: translateY(0);
        box-shadow: 0 2px 4px rgba(30, 58, 102, 0.3);
    }
    
    .send-button:disabled {
        background: #9ca3af;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
        opacity: 0.6;
    }

    .input-hints {
        display: flex;
        align-items: center;
        padding: 0.25rem 0.25rem 0;
    }

    .hint {
        font-size: 0.75rem;
        color: #9ca3af;
        display: flex;
        align-items: center;
        gap: 0.375rem;
    }

    .hint i {
        font-size: 0.7rem;
    }
    
    /* Responsive */
    @media (max-width: 640px) {
        .chat-container {
            padding: 0.625rem 0.75rem 0.375rem;
            height: calc(100vh - 70px);
            border-radius: 0.25rem;
        }
        
        .title {
            font-size: 1.5rem;
        }
        
        .subtitle {
            font-size: 0.875rem;
            margin-left: 2rem;
        }
        
        .message-bubble {
            max-width: 90%;
            padding: 0.65rem 0.875rem;
        }
        
        .message-input {
            font-size: 0.9rem;
            padding: 0.75rem 1rem;
            min-height: 44px;
        }

        .send-button {
            min-width: 48px;
            height: 44px;
            padding: 0.75rem 1.25rem;
        }

        .chat-header {
            padding: 0.75rem;
        }

        .chat-messages {
            padding: 0.625rem 0.375rem;
        }

        .chat-input-container {
            padding: 0.625rem 0.375rem 0.375rem;
        }

        .hint {
            font-size: 0.7rem;
        }
    }
</style>

