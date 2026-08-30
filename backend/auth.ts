import { Request, Response, NextFunction } from 'express';
import { User, UserRole, UserStatus } from '../src/types';
import { db } from './db';
import { getFirebaseAuth } from './firebaseAdmin';

export interface AuthRequest extends Request {
  user?: User;
  firebaseUid?: string;
  firebaseClaims?: Record<string, any>;
}

/**
 * Determine the default status a brand-new profile should get for a given role.
 * Students are active immediately. Teachers require Admin approval. Admin
 * profiles are only ever created by the trusted bootstrap path (see adminRoutes),
 * never through this default.
 */
export function defaultStatusForRole(role: UserRole): UserStatus {
  if (role === 'TEACHER') return 'PENDING';
  return 'ACTIVE';
}

/**
 * Verifies the Firebase ID token on every request (if present) and attaches the
 * corresponding EduStack user profile (role + status) to the request. This is the
 * single source of truth for identity - there is no separate/duplicate auth system.
 *
 * Frontend checks (e.g. hiding buttons) are for UI only. Every protected route below
 * still re-checks role/status server-side via requireAuth / requireRole / requireActiveAccess.
 */
export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const idToken = authHeader.split(' ')[1];

  try {
    const decoded = await getFirebaseAuth().verifyIdToken(idToken);
    req.firebaseUid = decoded.uid;
    req.firebaseClaims = decoded;

    let profile = db.findUserById(decoded.uid);
    // NOTE: this is the raw Firebase custom claim value ("admin", lowercase - as set by
    // setAdminClaim.ts), NOT the app's UserRole type (which is uppercase). Keep it as a
    // plain string so comparisons below are valid - don't cast this to UserRole.
    const claimRole = decoded.role as string | undefined;

    if (!profile && claimRole === 'admin') {
      // Defensive auto-provisioning: normally setAdminClaim.ts already creates this profile
      // directly, but if the claim ever exists without a local record, honor it here too.
      profile = db.promoteToAdmin({
        uid: decoded.uid,
        email: decoded.email || '',
        name: (decoded.name as string) || (decoded.email || 'Admin').split('@')[0],
      });
    } else if (profile && claimRole === 'admin' && profile.role !== 'ADMIN') {
      // Self-heal: the Firebase custom claim says this user is an Admin, but their local
      // profile is stale (e.g. they had registered as Student/Teacher before being granted
      // the claim). The Firebase claim is the trusted signal here - promote them.
      profile = db.promoteToAdmin({
        uid: decoded.uid,
        email: decoded.email || profile.email,
        name: profile.name,
      });
    }
    // IMPORTANT: for a brand-new Student/Teacher Firebase identity with no EduStack profile
    // yet, `profile` is intentionally left undefined here - NOT auto-created as a default
    // STUDENT. This middleware runs on every request (including the background "who's
    // logged in?" check that fires the instant Firebase creates the account, before the
    // frontend's explicit POST /auth/register with the chosen role even arrives). Auto-
    // creating a default-role profile here would race against that POST and could silently
    // lock in the wrong role. Only POST /auth/register (see authRoutes.ts) creates profiles
    // for Student/Teacher sign-ups, using the role the user actually chose.

    req.user = profile;
  } catch (err) {
    // Invalid/expired token: treat as unauthenticated rather than erroring the request,
    // so public routes still work. Protected routes below will reject via requireAuth.
    req.user = undefined;
  }

  next();
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    if (req.firebaseUid) {
      // Valid, verified Firebase identity, but no EduStack profile exists yet - this is
      // the brief window between Firebase account creation and the register call
      // completing (or an account that never finished registering). Distinguish this
      // from "not logged in at all" so the frontend can respond appropriately.
      return res.status(404).json({ error: 'Profile not found. Please complete registration.', code: 'NO_PROFILE' });
    }
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  next();
}

/** Requires a verified Firebase identity only - NOT an existing EduStack profile. Used
 * solely by POST /auth/register, since that's the one endpoint that's allowed to run
 * before a profile exists (it's the thing that creates it). */
export function requireFirebaseIdentity(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.firebaseUid) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  next();
}

/** Restricts a route to one or more roles. Does not check status - pair with requireActiveAccess. */
export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: requires one of [${roles.join(', ')}].` });
    }
    next();
  };
}

/**
 * Enforces the account-status rules from the spec:
 *  - STUDENT must be ACTIVE
 *  - TEACHER must be APPROVED (PENDING/REJECTED/SUSPENDED are denied)
 *  - ADMIN must be ACTIVE
 */
export function requireActiveAccess(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const { role, status } = req.user;

  if (role === 'STUDENT' && status !== 'ACTIVE') {
    return res.status(403).json({ error: 'Your student account is suspended.', status });
  }
  if (role === 'TEACHER' && status !== 'APPROVED') {
    return res.status(403).json({
      error:
        status === 'PENDING'
          ? 'Your teacher account is pending Admin approval.'
          : status === 'REJECTED'
          ? 'Your teacher registration was rejected.'
          : 'Your teacher account is suspended.',
      status,
    });
  }
  if (role === 'ADMIN' && status !== 'ACTIVE') {
    return res.status(403).json({ error: 'Admin account is not active.', status });
  }

  next();
}

export function requireTeacher(req: AuthRequest, res: Response, next: NextFunction) {
  requireRole('TEACHER')(req, res, (err?: any) => {
    if (err) return next(err);
    requireActiveAccess(req, res, next);
  });
}

export function requireStudent(req: AuthRequest, res: Response, next: NextFunction) {
  requireRole('STUDENT')(req, res, (err?: any) => {
    if (err) return next(err);
    requireActiveAccess(req, res, next);
  });
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireRole('ADMIN')(req, res, (err?: any) => {
    if (err) return next(err);
    requireActiveAccess(req, res, next);
  });
}
