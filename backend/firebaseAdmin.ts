import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

let app: App;

function loadServiceAccount() {
  // -------------------------------------------------------
  // PRODUCTION: Render environment variables
  // -------------------------------------------------------
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    return {
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, '\n'),
    };
  }

  // -------------------------------------------------------
  // LOCAL DEVELOPMENT: service-account.json
  // -------------------------------------------------------
  const backendPath = path.resolve(__dirname, 'service-account.json');
  const rootPath = path.resolve(process.cwd(), 'backend/service-account.json');
  const fallbackPath = path.resolve(process.cwd(), 'service-account.json');

  const possiblePaths = [backendPath, rootPath, fallbackPath];

  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (error) {
        console.error('Failed to read Firebase service account:', error);
      }
    }
  }

  return null;
}

const serviceAccount = loadServiceAccount();

if (!getApps().length) {
  if (!serviceAccount) {
    throw new Error(
      'Firebase Admin credentials not found. Configure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in production, or provide service-account.json locally.'
    );
  }

  app = initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
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