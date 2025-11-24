Reactivate user helper
======================

This folder contains a small Node CLI script to reactivate a user by clearing the `isArchived` flag
in Firestore and (optionally) re-enabling the Firebase Auth user. Use this only from a secure admin machine.

Prerequisites
-------------
- Node.js installed (v14+)
- A Firebase service account JSON placed at the project root named `serviceAccountKey.json` (download from Firebase Console -> Project Settings -> Service accounts)

Usage
-----
From the project root run:

```
node scripts/reactivate-user.js --uid <firebaseAuthUid>
```

Or use the custom patient id (the `customUserId` in the `users` doc):

```
node scripts/reactivate-user.js --customId 74689
```

What it does
------------
- If `--uid` provided: updates `users/{uid}` to set `isArchived: false`, `archived: false`, `status: 'Active'` and tries to `admin.auth().updateUser(uid, { disabled: false })`.
- If `--customId` provided: looks up the `users` document with `customUserId` and performs the uid-based action.

Security
--------
This script uses the Firebase Admin SDK and requires a service account — keep the JSON secure and do not commit it to source control.
