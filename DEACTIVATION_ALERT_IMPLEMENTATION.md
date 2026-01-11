# Real-time Account Deactivation Alert - Implementation Guide

## Overview
This implementation adds a real-time deactivation alert that automatically shows a popup when a user's account gets deactivated while they're still logged in.

## How It Works

### 1. Dual-Layer Protection
The system uses **two mechanisms** to ensure immediate detection and logout:

#### A. Real-time Firestore Listener
- The `authStore.ts` uses Firestore's `onSnapshot` listener to monitor the user's document in real-time
- Any changes to `isArchived`, `archived`, or `status` fields trigger immediate action
- Works even when user is idle on a single page

#### B. Navigation-based Status Check
- Every time the user navigates to a different page, the system checks their account status
- Added in `auth/+layout.svelte` - runs on every page change
- Ensures **instant logout** even if the real-time listener hasn't fired yet
- Prevents users from browsing between pages after deactivation

### 2. User Experience Flow
1. User is logged in and using the application
2. Admin deactivates the user account (sets `isArchived: true` or `status: 'Inactive'`)
3. **Immediately**, a modal popup appears showing:
   - "Account Deactivated" title
   - Deactivation message
   - Support contact emails
   - Auto-logout notification
4. After 3 seconds, the user is:
   - Signed out from Firebase Auth
   - Redirected to the login page
   - Shown another alert on the login page confirming the deactivation

### 3. Reactivation Handling
If an account is **reactivated** while the user is still logged in (admin changes status back to active):
1. The deactivation alert is **immediately hidden**
2. Any pending logout timeout is **cancelled**
3. User can continue using the application normally
4. No alerts or popups appear upon reactivation

### 3. Technical Components

#### Created Files:
1. **`src/lib/stores/deactivation.ts`**
   - Svelte store managing deactivation alert state
   - Functions: `showDeactivationAlert()`, `hideDeactivationAlert()`

2. **`src/lib/components/DeactivationAlert.svelte`**
   - Beautiful modal component with:
     - Warning icon
     - Clear messaging
     - Support contact information
     - Smooth animations (fade, scale)
     - High z-index (9999) to appear above everything

#### Modified Files:
1. **`src/routes/authStore.ts`**
   - Added import for `showDeactivationAlert` and `hideDeactivationAlert`
   - Added `logoutTimeout` variable to track pending logout
   - Modified the onSnapshot listener to:
     - Show alert and set timeout when account becomes inactive
     - **Hide alert and clear timeout when account becomes active**
     - Prevent duplicate logout timeouts

2. **`src/routes/auth/+layout.svelte`**
   - Added import for `DeactivationAlert` component
   - Added import for `showDeactivationAlert` and `hideDeactivationAlert` functions
   - Included `<DeactivationAlert />` in the template
   - **Added `checkUserActiveStatus()` function** - checks Firestore for account status
   - **Added navigation-based status check** - runs on every page change via `$page` subscription
   - **Clears alert when account is active** during navigation checks
   - Prevents deactivated users from navigating between pages

## Testing Instructions

### Test 1: Manual Firestore Update (While Staying on Same Page)
1. Log in as a patient user
2. Keep the browser open and stay on one page (e.g., profile)
3. Open Firebase Console → Firestore Database
4. Find the user's document in the `users` collection
5. Edit the document and set:
   - `isArchived: true` OR
   - `status: "Inactive"`
6. Save the changes
7. **Expected Result**: Within 1-2 seconds, the deactivation alert popup should appear (via real-time listener)
8. After 3 seconds, the user should be signed out and redirected to login

### Test 1B: Manual Firestore Update (While Navigating)
1. Log in as a patient user
2. Deactivate the account via Firebase Console (same as above)
3. **Try to navigate to a different page** (e.g., Information, Appointments, Chat)
4. **Expected Result**: The deactivation alert should appear **immediately** upon navigation
5. User cannot continue browsing and will be logged out after 3 seconds

### Test 2: Using Deactivation Script
1. Log in as a patient user in the browser
2. Note the user's Patient ID or UID
3. Open a terminal and run:
   ```bash
   node scripts/deactivate-user.js --customId <PATIENT_ID>
   # or
   node scripts/deactivate-user.js --uid <FIREBASE_UID>
   ```
4. Return to the browser (keep it on the logged-in page)
5. **Expected Result**: The deactivation alert should appear immediately
6. After 3 seconds, automatic sign-out and redirect to login
4: Reactivation Scenario
1. Log in as a patient user
2. Deactivate the account using Firebase Console or the deactivation script
3. **Expected Result**: Deactivation alert appears
4. **Before the 3-second timeout expires**, reactivate the account:
   - Set `isArchived: false` in Firestore
   - Set `status: "Active"` in Firestore
5. **Expected Result**: 
   - The deactivation alert should **disappear immediately**
   - The logout should be **cancelled**
   - User can continue using the application normally
   - No need to refresh or take any action
### Test 3: Multiple Tab Scenario
1. Log in as a patient user
2. ODual-Layer Detection**: Real-time listener + navigation-based checks
✅ **Instant Navigation Block**: Cannot browse pages after deactivation
✅ **Real-time Monitoring**: Firestore snapshot listener for background detection✅ **Reactivation Support**: Alert clears automatically if account is reactivated
✅ **Smart Timeout Management**: Prevents duplicate logouts and cancels on reactivation✅ **User-friendly Alert**: Beautiful modal with clear information
✅ **Contact Information**: Displays support emails for assistance
✅ **Graceful Logout**: 3-second delay allows users to read the message
✅ **Multi-tab Support**: Works across all open tabs/windows
✅ **Persistent Notification**: Shows alert again on login page
✅ **High Priority**: Alert appears above all other UI elements (z-index: 9999)
✅ **Smooth Animations**: Professional fade and scale transitions
✅ **Prevents Browsing**: Users cannot navigate between pages when deactivatedinstant updates
✅ **User-friendly Alert**: Beautiful modal with clear information
✅ **Contact Information**: Displays support emails for assistance
✅ **Graceful Logout**: 3-second delay allows users to read the message
✅ **Multi-tab Support**: Works across all open tabs/windows
✅ **Persistent Notification**: Shows alert again on login page
✅ **High Priority**: Alert appears above all other UI elements (z-index: 9999)
✅ **Smooth Animations**: Professional fade and scale transitions

## Customization

### Adjust Auto-logout Timer
In `src/routes/authStore.ts`, line 53:
```typescript
setTimeout(async () => {
  // ... sign out logic
}, 3000); // Change 3000 to desired milliseconds
```

### Customize Alert Appearance
Edit `src/lib/components/DeactivationAlert.svelte`:
- Change colors in the gradient header
- Modify the icon
- Update the support email addresses
- Adjust the styling

### Change Alert Message
In `src/lib/stores/deactivation.ts`:
```typescript
export function showDeactivationAlert() {
  deactivationAlert.set({
    show: true,
    message: 'Your custom message here'
  });
}
```

## Browser Compatibility
- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers

## Security Notes
- The deactivation is enforced both client-side and server-side
- Firebase Auth account is disabled when using the deactivation script
- Real-time listener ensures immediate enforcement
- User cannot bypass the deactivation by staying logged in

## Troubleshooting

### Alert doesn't appear
1. Check browser console for errors
2. Verify Firestore rules allow read access to user's own document
3. Ensure Firebase is properly initialized
4. Check that the user document has the correct structure

### Alert appears but no redirect
1. Check browser console for navigation errors
2. Verify localStorage is enabled
3. Check if popup blockers are interfering

### Works in one tab but not others
1. This is expected behavior - each tab runs independently
2. The listener should fire in each tab, showing the alert in all of them
