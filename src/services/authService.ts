import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

/**
 * Thin wrapper around the Firebase Authentication client SDK.
 *
 * This is the ONLY place the frontend talks to Firebase Auth directly. All role/status
 * authorization is decided by the backend (see backend/auth.ts) after it independently
 * verifies the ID token this module produces - the frontend never grants dashboard
 * access on its own.
 */
export const authService = {
  onAuthChange(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  async login(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    return cred.user;
  },

  /**
   * Creates the Firebase Auth account for a Student or Teacher. NOTE: this never creates
   * Admin accounts - Admin accounts are provisioned manually via Firebase Console per the
   * spec, never through this public-facing signup flow.
   */
  async registerStudentOrTeacher(name: string, email: string, password: string) {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (name?.trim()) {
      await updateProfile(cred.user, { displayName: name.trim() });
    }
    return cred.user;
  },

  async logout() {
    await signOut(auth);
  },

  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  },

  async getIdToken(forceRefresh = false): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;
    return user.getIdToken(forceRefresh);
  },
};
