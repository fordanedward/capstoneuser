import { writable } from 'svelte/store';
import type { Firestore } from 'firebase/firestore';
import { doc, getDoc, setDoc, updateDoc, increment, getFirestore } from 'firebase/firestore';
import { browser } from '$app/environment';
import { app } from '$lib/firebaseConfig';

export const visitorCount = writable<number | null>(null);

const VISITOR_DOC_ID = 'siteStats';

/**
 * Increment the visitor count in Firestore
 */
export async function incrementVisitorCount() {
	if (!browser || !app) return;

	try {
		const db = getFirestore(app);
		const visitorDocRef = doc(db, 'analytics', VISITOR_DOC_ID);
		const visitorDoc = await getDoc(visitorDocRef);

		if (visitorDoc.exists()) {
			// Increment existing count
			await updateDoc(visitorDocRef, {
				totalVisitors: increment(1),
				lastVisit: new Date().toISOString()
			});
		} else {
			// Create new document with initial count
			await setDoc(visitorDocRef, {
				totalVisitors: 1,
				lastVisit: new Date().toISOString(),
				createdAt: new Date().toISOString()
			});
		}

		// Fetch updated count
		await fetchVisitorCount();
	} catch (error) {
		console.error('Error incrementing visitor count:', error);
	}
}

/**
 * Fetch the current visitor count from Firestore
 */
export async function fetchVisitorCount() {
	if (!browser || !app) return;

	try {
		const db = getFirestore(app);
		const visitorDocRef = doc(db, 'analytics', VISITOR_DOC_ID);
		const visitorDoc = await getDoc(visitorDocRef);

		if (visitorDoc.exists()) {
			const data = visitorDoc.data();
			visitorCount.set(data.totalVisitors || 0);
		} else {
			visitorCount.set(0);
		}
	} catch (error) {
		console.error('Error fetching visitor count:', error);
		visitorCount.set(0);
	}
}
