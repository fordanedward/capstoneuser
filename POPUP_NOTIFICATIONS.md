# Popup Notification System

## Overview
This system provides Facebook-style popup notifications for real-time updates on chat messages and appointment status changes. The notifications appear as toast popups in the top-right corner and are also accessible via a notification bell icon with a badge counter.

## Features

### 1. **Real-time Notifications**
- Automatically detects new chat messages from admin
- Tracks appointment status changes (Accepted, Declined, Rescheduled, etc.)
- Shows refund status updates
- Plays a subtle notification sound

### 2. **Notification Types**
- **Chat**: New messages from admin
- **Appointment**: Status changes, confirmations, cancellations
- **Info**: General system notifications

### 3. **User Interface**
- **Toast Popups**: Slide in from the right, auto-dismiss after 6 seconds
- **Notification Bell**: Shows unread count badge
- **Dropdown Panel**: View notification history (up to 20 recent notifications)
- **Click to Navigate**: Clicking a notification navigates to relevant page

## Components

### PopupNotification.svelte
Main notification component with:
- Bell icon with badge counter
- Toast popup notifications
- Dropdown history panel
- Persistent storage (localStorage)

### notificationService.ts
Real-time listener service that:
- Monitors Firestore for chat messages
- Monitors Firestore for appointment changes
- Triggers popup notifications
- Prevents duplicate notifications

## Notification Triggers

### Chat Notifications
Triggered when:
- Admin sends a new message
- Message is from `senderRole === 'admin'`
- Message hasn't been seen before

### Appointment Notifications
Triggered for status changes:
- `Accepted` / `confirmed` → "Appointment Confirmed! ✅"
- `Decline` / `declined` → "Appointment Declined ❌"
- `Rescheduled` → "Appointment Rescheduled 📅"
- `Completed` → "Appointment Completed ✓"
- `cancellationStatus: 'Approved'` → "Cancellation Approved"
- `cancellationStatus: 'decline'` → "Cancellation Declined"
- `paymentStatus: 'refunded'` → "Refund Processed 💰"

## How It Works

1. **Initialization**: When user logs in, `notificationService.ts` initializes Firestore listeners
2. **Real-time Monitoring**: Listeners watch for document changes in `chats` and `appointments` collections
3. **Notification Creation**: On relevant change, service calls `addNotification()` function
4. **Display**: Component shows toast popup and updates bell badge
5. **Persistence**: Notifications saved to localStorage for persistence across page reloads
6. **Auto-dismiss**: Toast notifications auto-dismiss after 6 seconds
7. **Manual Dismiss**: Users can click X to dismiss individual notifications

## Installation & Setup

The system is already integrated into the main layout (`+layout.svelte`). No additional setup needed!

## Usage

### Manual Notification (Optional)
To manually trigger a notification from any component:

```typescript
import { addNotification } from '$lib/components/PopupNotification.svelte';

addNotification({
    type: 'info',
    title: 'Custom Notification',
    message: 'Your custom message here',
    link: '/your-page',
    icon: 'fas fa-info-circle'
});
```

### Test Notifications
To test the system:
1. **Chat**: Have an admin send a message through the admin panel
2. **Appointment**: Have an admin approve/decline an appointment

## Styling

The notification system uses:
- Color-coded notifications (blue for chat, green for appointments)
- Smooth animations (slide-in/fade)
- Responsive design (adapts to mobile)
- z-index: 10000 (appears above everything)

## Mobile Responsive

- Bell icon adjusts size for mobile
- Toast notifications stack vertically
- Dropdown panel adapts width for mobile screens
- Positioned below mobile header on small screens

## Browser Support

- Modern browsers with ES6+ support
- localStorage required for persistence
- Web Audio API for notification sound (optional)

## Accessibility

- ARIA labels for screen readers
- Keyboard navigable
- High contrast colors
- Touch-friendly tap targets on mobile

## Troubleshooting

### Notifications not appearing?
- Check browser console for errors
- Verify user is logged in
- Ensure Firebase is properly initialized
- Check that admin is sending messages correctly

### Duplicate notifications?
- The system tracks seen notifications in `seenMessages` and `seenAppointments` Sets
- These are cleared on logout and reinitialization

### Sound not playing?
- Browser may block autoplay audio until user interaction
- User must interact with page first (e.g., click anywhere)

## File Structure

```
src/
├── lib/
│   ├── components/
│   │   └── PopupNotification.svelte    # Main UI component
│   └── services/
│       └── notificationService.ts      # Real-time listener service
└── routes/
    └── +layout.svelte                  # Integration point
```

## Future Enhancements

Possible improvements:
- Push notifications support
- Custom notification sounds
- Notification settings/preferences
- Mark as read individually
- Filter notifications by type
- Export notification history

## License

Part of the PHP Digital Member Portal project.
