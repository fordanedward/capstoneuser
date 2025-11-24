#!/usr/bin/env node
/**
 * Simple Node CLI to reactivate a user by clearing `isArchived` and setting `status: 'Active'`.
 *
 * Usage:
 *   node scripts/reactivate-user.js --uid <firebaseUid>
 *   node scripts/reactivate-user.js --customId <customUserId>
 *
 * Requires a service account JSON file at `./serviceAccountKey.json` (download from Firebase)
 * and the project ID set in that credentials file.
 */

const admin = require('firebase-admin');
const { program } = require('commander');

program
  .option('--uid <uid>', 'Firebase Auth UID of the user')
  .option('--customId <customId>', 'customUserId (Patient ID) stored in users documents')
  .parse(process.argv);

const options = program.opts();

if (!options.uid && !options.customId) {
  console.error('Either --uid or --customId must be provided.');
  process.exit(1);
}

// Load service account
let serviceAccount;
try {
  serviceAccount = require('../serviceAccountKey.json');
} catch (e) {
  console.error('Could not load serviceAccountKey.json. Place your Firebase service account JSON at project root as serviceAccountKey.json');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function reactivateByUid(uid) {
  const userRef = db.doc(`users/${uid}`);
  const snap = await userRef.get();
  if (!snap.exists) {
    console.error(`No users document found for uid ${uid}`);
    return;
  }
  await userRef.update({ isArchived: false, archived: false, status: 'Active' });
  try {
    await admin.auth().updateUser(uid, { disabled: false });
    console.log(`Reactivated Auth user ${uid} (enabled) and cleared isArchived.`);
  } catch (e) {
    console.warn('User re-enabled in Auth failed or user not present in Auth:', e.message || e);
    console.log('Cleared Firestore flags for users document.');
  }
}

async function reactivateByCustomId(customId) {
  const q = await db.collection('users').where('customUserId', '==', String(customId)).limit(1).get();
  if (q.empty) {
    console.error(`No users document found with customUserId=${customId}`);
    return;
  }
  const docSnap = q.docs[0];
  const uid = docSnap.id;
  await reactivateByUid(uid);
}

(async () => {
  try {
    if (options.uid) await reactivateByUid(options.uid);
    else if (options.customId) await reactivateByCustomId(options.customId);
    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Error reactivating user:', err);
    process.exit(1);
  }
})();
