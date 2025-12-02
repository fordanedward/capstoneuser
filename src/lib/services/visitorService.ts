import { 
    collection, 
    addDoc, 
    query, 
    where, 
    getDocs, 
    serverTimestamp, 
    getFirestore 
} from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { firebaseConfig } from '$lib/firebaseConfig';
import { browser } from '$app/environment';

/**
 * Get Firestore instance
 */
function getDB() {
    if (!browser) return null;
    try {
        const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
        return getFirestore(app);
    } catch (error) {
        console.error('Error getting Firestore instance:', error);
        return null;
    }
}

/**
 * Get or create a unique visitor ID stored in localStorage
 */
function getVisitorId(): string {
    if (!browser) return '';
    
    const VISITOR_ID_KEY = 'php_visitor_id';
    let visitorId = localStorage.getItem(VISITOR_ID_KEY);
    
    if (!visitorId) {
        // Generate a unique ID based on timestamp and random string
        visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem(VISITOR_ID_KEY, visitorId);
    }
    
    return visitorId;
}

/**
 * Get today's date as a string (YYYY-MM-DD)
 */
function getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

/**
 * Track a page visit
 */
export async function trackPageVisit(pagePath: string = '/'): Promise<void> {
    if (!browser) return;
    
    const db = getDB();
    if (!db) return;
    
    try {
        const visitorId = getVisitorId();
        const todayDate = getTodayDate();
        
        // Check if this visitor has already visited today
        const visitorsRef = collection(db, 'pageVisitors');
        const q = query(
            visitorsRef,
            where('visitorId', '==', visitorId),
            where('visitDate', '==', todayDate),
            where('pagePath', '==', pagePath)
        );
        
        const existingVisits = await getDocs(q);
        
        // Only log if they haven't visited this page today
        if (existingVisits.empty) {
            await addDoc(visitorsRef, {
                visitorId,
                visitDate: todayDate,
                pagePath,
                userAgent: navigator.userAgent,
                timestamp: serverTimestamp(),
                visitTimestamp: new Date()
            });
        }
    } catch (error) {
        console.error('Error tracking page visit:', error);
    }
}

/**
 * Get the total number of unique visitors
 */
export async function getUniqueVisitorCount(): Promise<number> {
    if (!browser) return 0;
    
    const db = getDB();
    if (!db) return 0;
    
    try {
        const visitorsRef = collection(db, 'pageVisitors');
        const allVisits = await getDocs(visitorsRef);
        
        // Get unique visitor IDs
        const uniqueVisitors = new Set<string>();
        allVisits.forEach(doc => {
            const data = doc.data();
            uniqueVisitors.add(data.visitorId);
        });
        
        return uniqueVisitors.size;
    } catch (error) {
        console.error('Error getting unique visitor count:', error);
        return 0;
    }
}

/**
 * Get unique visitors for a specific date
 */
export async function getUniqueVisitorsForDate(dateStr: string): Promise<number> {
    if (!browser) return 0;
    
    const db = getDB();
    if (!db) return 0;
    
    try {
        const visitorsRef = collection(db, 'pageVisitors');
        const q = query(visitorsRef, where('visitDate', '==', dateStr));
        const visits = await getDocs(q);
        
        // Get unique visitor IDs for this date
        const uniqueVisitors = new Set<string>();
        visits.forEach(doc => {
            const data = doc.data();
            uniqueVisitors.add(data.visitorId);
        });
        
        return uniqueVisitors.size;
    } catch (error) {
        console.error('Error getting unique visitor count for date:', error);
        return 0;
    }
}

/**
 * Get unique visitors for today
 */
export async function getTodayUniqueVisitors(): Promise<number> {
    return getUniqueVisitorsForDate(getTodayDate());
}

/**
 * Get visit statistics for the current month
 */
export async function getMonthVisitStats(): Promise<{ date: string; count: number }[]> {
    if (!browser) return [];
    
    const db = getDB();
    if (!db) return [];
    
    try {
        const visitorsRef = collection(db, 'pageVisitors');
        const allVisits = await getDocs(visitorsRef);
        
        const statsByDate = new Map<string, Set<string>>();
        
        allVisits.forEach(doc => {
            const data = doc.data();
            const date = data.visitDate;
            
            if (!statsByDate.has(date)) {
                statsByDate.set(date, new Set<string>());
            }
            statsByDate.get(date)!.add(data.visitorId);
        });
        
        const result = Array.from(statsByDate.entries())
            .map(([date, visitors]) => ({
                date,
                count: visitors.size
            }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        return result;
    } catch (error) {
        console.error('Error getting month visit stats:', error);
        return [];
    }
}

/**
 * Get the current visitor ID (useful for debugging)
 */
export function getCurrentVisitorId(): string {
    return getVisitorId();
}

/**
 * Reset the visitor ID (mainly for testing)
 */
export function resetVisitorId(): void {
    if (browser) {
        localStorage.removeItem('php_visitor_id');
    }
}