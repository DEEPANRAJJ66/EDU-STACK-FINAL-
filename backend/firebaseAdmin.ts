import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import path from 'path';
import fs from 'fs';

// Look for credentials in this order:
// 1. FIREBASE_SERVICE_ACCOUNT_JSON env var (used on Render/production, since the raw
//    file is never committed to git for security reasons)
// 2. A local service-account.json file in backend/ or the project root (used for local dev)
const serviceAccountPath = path.resolve(__dirname, 'service-account.json');
const fallbackPath = path.resolve(process.cwd(), 'service-account.json');

let serviceAccount: any = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
} else if (fs.existsSync(serviceAccountPath)) {
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
} else if (fs.existsSync(fallbackPath)) {
  serviceAccount = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
}

let app: App;
export const hasFirebaseCredentials = !!serviceAccount;

if (!getApps().length) {
  if (serviceAccount) {
    app = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
    console.log(
      `[Firebase] Admin SDK initialized with service account for project "${serviceAccount.project_id}". ` +
      `Live persistence (tests/attempts/errorNotes surviving a restart) is active.`
    );
  } else {
    app = initializeApp();
    // No FIREBASE_SERVICE_ACCOUNT_JSON env var and no local service-account.json found.
    // On Render (or any non-GCP host) this falls back to Application Default Credentials,
    // which do NOT exist there — every Firestore read/write below will fail. This is not
    // thrown here because auth failures only surface when a Firestore call is actually
    // made, but it is logged loudly now so it shows up in the Render deploy logs
    // immediately instead of being discovered later as "my data disappeared".
    console.error(
      '[Firebase] WARNING: no service account credentials found (FIREBASE_SERVICE_ACCOUNT_JSON ' +
      'env var is not set, and no backend/service-account.json file exists). Firestore calls will ' +
      'fail silently, so teacher-created tests, student attempts, and error notes will NOT survive ' +
      'a server restart/redeploy on Render. Set FIREBASE_SERVICE_ACCOUNT_JSON in the Render ' +
      'dashboard (Environment tab) to the full JSON contents of your Firebase service account key.'
    );
  }
} else {
  app = getApps()[0];
}

export const getFirebaseFirestore = (): Firestore => {
  return getFirestore(app);
};

export const getFirebaseAuth = (): Auth => {
  return getAuth(app);
};

export default app;