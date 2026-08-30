import { Router } from 'express';
import { db } from '../db';
import { AuthRequest, requireAuth, requireFirebaseIdentity, defaultStatusForRole } from '../auth';
import { UserRole } from '../../src/types';

export const authRouter = Router();

/**
 * Register/sync an EduStack profile for the currently signed-in Firebase user.
 *
 * The Firebase Authentication account itself is created client-side (via the Firebase
 * client SDK). This is the ONE place a Student/Teacher profile gets created, using the
 * role explicitly declared here in the request body - never guessed/defaulted elsewhere
 * (see backend/auth.ts for why that matters: it avoids a race with the background
 * "who's logged in?" check that fires the instant the Firebase account exists).
 *
 * Uses requireFirebaseIdentity (not requireAuth) because, for a brand new sign-up, there
 * is no EduStack profile yet - that's precisely what this route creates.
 */
authRouter.post('/register', requireFirebaseIdentity, (req: AuthRequest, res) => {
  const { name, role } = req.body as { name?: string; role?: UserRole };

  if (role === 'ADMIN') {
    return res.status(403).json({ error: 'Admin registration is not available.' });
  }
  if (role !== 'STUDENT' && role !== 'TEACHER') {
    return res.status(400).json({ error: 'Role must be STUDENT or TEACHER.' });
  }

  // If a profile already exists (e.g. this call is retried, or the user already
  // registered before), just return it as-is - never silently change an existing
  // account's role/status through this endpoint.
  let profile = db.findUserById(req.firebaseUid!);

  if (!profile) {
    profile = db.upsertUserFromFirebase({
      uid: req.firebaseUid!,
      email: req.firebaseClaims?.email || '',
      name: name?.trim() || (req.firebaseClaims?.email || 'User').split('@')[0],
      role,
      status: defaultStatusForRole(role),
    });
  }

  return res.status(201).json({ user: profile });
});

// Get current user's EduStack profile (role + status), derived from their verified
// Firebase ID token. This is what the frontend polls after Firebase sign-in/sign-up.
// Returns 404 (not 401) if the token is valid but no profile exists yet - see requireAuth.
authRouter.get('/me', requireAuth, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});
