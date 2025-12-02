# Visitor Tracking Implementation Guide

## Overview
A visitor tracking system has been added to the PHP Digital Member Portal that displays the total number of unique visitors and today's visitors on the homepage.

## What Was Added

### 1. Visitor Service (`src/lib/services/visitorService.ts`)
This TypeScript service handles all visitor tracking logic:

- **`trackPageVisit(pagePath)`** - Tracks each page visit (once per day per visitor)
- **`getUniqueVisitorCount()`** - Returns the total number of unique visitors across all time
- **`getTodayUniqueVisitors()`** - Returns the count of unique visitors for today
- **`getUniqueVisitorsForDate(dateStr)`** - Returns unique visitors for a specific date
- **`getMonthVisitStats()`** - Returns visitor statistics for the current month

**Key Features:**
- Each visitor gets a unique ID stored in localStorage
- Visits are tracked only once per day per visitor per page
- Uses Firestore for persistence
- Browser-only (no server-side tracking)

### 2. Visitor Counter Component (`src/lib/components/VisitorCounter.svelte`)
A beautifully styled component that displays visitor statistics on the homepage:

- Shows total unique visitors with a growing counter
- Shows today's visitor count
- Displays loading skeleton while fetching data
- Smooth slide-in animation when data loads
- Fully responsive design (mobile-friendly)
- Themed with PHP's brand colors (dark blue and gold)

### 3. Updated Homepage (`src/routes/+page.svelte`)
The component is integrated into the landing page after the "About PHP" section.

## How It Works

1. When a user visits the application, a unique visitor ID is generated and stored in their localStorage
2. Each page visit is recorded in Firestore's `pageVisitors` collection (limited to once per day per page)
3. The visitor counter component loads and fetches statistics from Firestore
4. Statistics are displayed with smooth animations

## Firestore Collection Structure

**Collection:** `pageVisitors`

**Document Fields:**
```
{
  visitorId: string,           // Unique visitor identifier
  visitDate: string,           // Date in YYYY-MM-DD format
  pagePath: string,            // The page path visited
  userAgent: string,           // Browser/device information
  timestamp: Firestore.Timestamp, // Server timestamp
  visitTimestamp: Date         // Visit timestamp
}
```

## Required Firestore Rules

Update your `firestore.rules` to allow reading visitor counts:

```firestore
match /pageVisitors/{document=**} {
  allow create: if request.auth != null;
  allow read: if request.auth != null;
  allow update, delete: if false;
}
```

## User Tracking Privacy

- **No personal data is collected** - only anonymized visitor IDs
- **Local storage only** - visitor IDs are stored locally on users' devices
- **Transparent tracking** - users can clear their visitor ID by clearing localStorage
- **No authentication required** - visitor tracking works for both authenticated and unauthenticated users

## Customization

### Changing Display Text
Edit `src/lib/components/VisitorCounter.svelte`:
```svelte
<p class="stat-label">Total Unique Visitors</p>  // Change this
<p class="stat-label">Today's Visitors</p>       // And this
```

### Styling
Modify the CSS in the VisitorCounter component to match your brand colors.

### Tracking Different Pages
The `trackPageVisit()` function is automatically called with the current pathname, but you can manually specify different paths:

```svelte
import { trackPageVisit } from '$lib/services/visitorService';

onMount(async () => {
  await trackPageVisit('/custom-page-name');
});
```

## Testing

To test the visitor tracking:

1. Open the homepage - you should see the counter loading
2. The count should increase after a few seconds
3. Refresh the page - the count should remain the same (same visitor, same day)
4. Clear localStorage and refresh - a new visitor ID is generated
5. Check Firestore console to see the recorded visits

## Performance Considerations

- First load triggers Firestore queries to count unique visitors
- Results are cached in component state while the page is open
- To add caching across sessions, consider using SvelteKit's data loading
- For high-traffic sites, consider adding periodic aggregation of visitor data

## Troubleshooting

### Visitors Not Being Tracked
- Check if Firestore is initialized correctly
- Verify Firestore rules allow write access to `pageVisitors` collection
- Check browser console for any errors
- Ensure browser allows localStorage

### Counts Not Updating
- Verify `pageVisitors` collection exists in Firestore
- Check browser's localStorage isn't disabled
- Ensure user has permissions to read from Firestore

### Performance Issues
- If you have millions of records, consider archiving old visitor data
- Add indexes to `pageVisitors` collection for `visitorId` and `visitDate` fields