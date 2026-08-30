import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import path from 'path';
import fs from 'fs';

// Look for service-account.json in backend/ or root
const serviceAccountPath = path.resolve(__dirname, 'service-account.json');
const fallbackPath = path.resolve(process.cwd(), 'service-account.json');

let serviceAccount: any = null;

if (fs.existsSync(serviceAccountPath)) {
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
} else if (fs.existsSync(fallbackPath)) {
  serviceAccount = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
}

let app: App;

if (!getApps().length) {
  if (serviceAccount) {
    app = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  } else {
    app = initializeApp();
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