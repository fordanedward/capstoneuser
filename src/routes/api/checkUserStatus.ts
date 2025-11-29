import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
let db: admin.firestore.Firestore;

try {
  if (!admin.apps.length) {
    // Use default credentials from environment
    admin.initializeApp({
      projectId: 'integratedsystem-4040b'
    });
  }
  db = admin.firestore();
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error);
}

export const GET: RequestHandler = async ({ request }) => {
  // Extract the UID from the custom header
  const uid = request.headers.get('x-user-uid');
  
  if (!uid) {
    return json({ status: 'unauthenticated' }, { status: 401 });
  }

  try {
    const userRef = db.collection('users').doc(uid);
    const snap = await userRef.get();

    if (!snap.exists) {
      return json({ status: 'notfound' }, { status: 404 });
    }

    const data = snap.data();
    const isInactive = data?.isArchived || data?.archived || data?.status === 'Inactive';

    if (isInactive) {
      return json({ status: 'inactive', message: 'Your account has been deactivated' }, { status: 403 });
    }

    return json({ status: 'active' });
  } catch (error) {
    console.error('Error checking user status:', error);
    return json({ status: 'error', message: 'Failed to check user status' }, { status: 500 });
  }
};
