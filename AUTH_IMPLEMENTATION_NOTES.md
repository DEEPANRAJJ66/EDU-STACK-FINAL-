# EduStack — Firebase Authentication & Role-Based Access: Implementation Notes

## What changed

### Removed
- **Role Switch feature** — completely removed (Navbar dropdown, `Switch Role / Account`
  menu, `api.auth.switchRole`, `api.auth.getDemoUsers`, quick-login-by-email, and all
  related handlers in `App.tsx`). There is no way to change role from inside the app anymore.
- The old custom JWT auth system (`jsonwebtoken`-signed tokens, `db.checkPassword`,
  `db.createUser` with bcrypt) has been replaced — not duplicated — by Firebase
  Authentication end-to-end.

### Backend (`backend/`)
- `auth.ts` — `authenticate` now verifies real Firebase ID tokens via `firebase-admin`
  (`getFirebaseAuth().verifyIdToken`). Adds `requireRole(...)`, `requireActiveAccess`
  (status gate), and rewires `requireTeacher` / `requireStudent` to also enforce status
  (`TEACHER` must be `APPROVED`, `STUDENT` must be `ACTIVE`) — so every existing route in
  `testRoutes.ts`, `questionRoutes.ts`, `attemptRoutes.ts`, `plannerRoutes.ts` is now
  status-aware **without editing those files**. New `requireAdmin`.
- `routes/authRoutes.ts` — `POST /auth/register` syncs an EduStack profile (role + status)
  for the verified Firebase identity; `GET /auth/me` returns it.
- `routes/adminRoutes.ts` — new. Teacher approve/reject/suspend/reactivate, student
  suspend/reactivate, platform-level test publish/unpublish/remove, dashboard overview
  counts. All routes require `requireAdmin` (role `ADMIN` + status `ACTIVE`, verified
  server-side).
- `db.ts` — added `upsertUserFromFirebase`, `updateUserStatus`, `getUsersByRole`,
  `getAdminOverview`. Existing methods (tests/questions/attempts/planner) untouched.
- `scripts/setAdminClaim.ts` — **the only way to create an Admin.** Run manually after
  creating the Firebase Auth user via the Console (see setup steps below).

### Frontend (`src/`)
- `types.ts` — `UserRole` now includes `'ADMIN'`; `User` has a `status` field.
- `services/authService.ts` — new thin wrapper around the Firebase client SDK
  (login / register / logout / getIdToken / onAuthChange).
- `services/api.ts` — auth section rewritten to attach a live Firebase ID token to every
  request instead of a cached custom JWT; added `api.admin.*`.
- `components/LoginPage.tsx` — Student/Teacher login+register (tabs). No Admin option.
- `components/AdminLoginPage.tsx` — separate, unlinked page rendered only when the URL
  path is `/admin-login`. No signup form.
- `components/AccessStatusScreen.tsx` — shown for pending/rejected/suspended accounts.
- `components/AdminDashboard.tsx` — sidebar (Dashboard/Teachers/Students/Tests), overview
  cards, pending-approvals banner, teacher/student tables with status badges + confirm
  dialogs for suspend/reject/remove.
- `components/Navbar.tsx` — role-switch UI fully removed; otherwise unchanged.
- `App.tsx` — replaced the old "auto-login as demo teacher" bootstrapping with a real
  `onAuthStateChanged` listener. Renders `LoginPage`/`AdminLoginPage` when signed out,
  `AccessStatusScreen` when signed in but not authorized for a dashboard yet,
  `AdminDashboard` for admins, and the existing Teacher/Student experience unchanged
  otherwise. All existing test/quiz/whiteboard/planner/analytics code is untouched.

### `firestore.rules`
Updated so `isTeacher()`-equivalent checks require `status == 'APPROVED'`, not just
`role == 'TEACHER'`, and user documents can't self-modify `role`/`status` from the client.

## Required manual setup (cannot be done from code)

1. **Enable Email/Password sign-in** in Firebase Console → Authentication → Sign-in method
   (if not already on) — the app now uses it for real.
2. **Create the first Admin account**: Firebase Console → Authentication → Users → Add
   User, with a private admin email/password (never commit these anywhere).
3. Copy that user's UID, then run:
   ```
   npx tsx backend/scripts/setAdminClaim.ts <uid> "Admin Name"
   ```
   This sets the `role: "admin"` custom claim and creates the matching EduStack profile
   (`role: ADMIN`, `status: ACTIVE`). Requires `GOOGLE_APPLICATION_CREDENTIALS` /
   `backend/service-account.json` to be configured (already present in this project).
4. Sign in at `/admin-login` with that email/password.
5. Deploy the updated `firestore.rules` if you rely on direct client Firestore access.

## Acceptance test coverage
Every scenario in the spec's "Final Acceptance Test" section maps directly to the pieces
above: student self-registers active immediately; teacher self-registers `PENDING` and is
blocked from `/teacher/*` and the Teacher Dashboard until an Admin approves; Admin login is
only reachable at `/admin-login` and has no signup; Admin suspend/approve immediately
affects the next API call (fresh ID token + server-side status check on every request, no
client caching); cross-role API calls are rejected by `requireRole`/`requireActiveAccess`
server-side regardless of what the UI shows.
