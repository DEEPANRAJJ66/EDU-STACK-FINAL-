/**
 * One-time CLI script to grant Admin authorization.
 *
 * This is intentionally NOT reachable from any HTTP route or the frontend - Admin
 * accounts are never created or promoted through the public app, per the spec:
 *   1. Create the Firebase Auth user manually via Firebase Console -> Authentication
 *      -> Users -> Add User, with a private admin email/password.
 *   2. Run this script locally (with GOOGLE_APPLICATION_CREDENTIALS / service-account.json
 *      configured) to set the `role: "admin"` custom claim on that user AND create their
 *      EduStack profile with role ADMIN / status ACTIVE.
 *
 * Usage:
 *   npx tsx backend/scripts/setAdminClaim.ts <firebase-uid> "Admin Name"
 */
import { getFirebaseAuth } from '../firebaseAdmin';
import { db } from '../db';

async function main() {
  const [, , uid, name] = process.argv;

  if (!uid) {
    console.error('Usage: npx tsx backend/scripts/setAdminClaim.ts <firebase-uid> "Admin Name"');
    process.exit(1);
  }

  const auth = getFirebaseAuth();
  const userRecord = await auth.getUser(uid);

  await auth.setCustomUserClaims(uid, { role: 'admin' });

  // Forcibly promote/create the local profile as ADMIN/ACTIVE - this OVERWRITES any
  // pre-existing role (e.g. if this email had previously registered as a Student/Teacher
  // while testing). Unlike the normal registration path, this script is a trusted,
  // manual, developer-run action, so overwriting is intentional here.
  db.promoteToAdmin({
    uid,
    email: userRecord.email || '',
    name: name || userRecord.displayName || (userRecord.email || 'Admin').split('@')[0],
  });

  console.log(`Custom claim role="admin" set for uid ${uid} (${userRecord.email}).`);
  console.log('EduStack Admin profile created/synced. The user must sign out and back in (or refresh their ID token) for the new claim to take effect.');
  process.exit(0);
}

main().catch(err => {
  console.error('Failed to set admin claim:', err);
  process.exit(1);
});
