import { Router } from 'express';
import { db } from '../db';
import { AuthRequest, requireAdmin } from '../auth';

export const adminRouter = Router();

// Every route in this file is Admin-only and requires an ACTIVE admin account
// (verified server-side from the Firebase ID token - never trust the frontend).
adminRouter.use(requireAdmin);

// --- Dashboard overview ---
adminRouter.get('/overview', (req: AuthRequest, res) => {
  res.json(db.getAdminOverview());
});

// --- Teacher management ---
adminRouter.get('/teachers', (req: AuthRequest, res) => {
  const { status } = req.query as { status?: string };
  let teachers = db.getUsersByRole('TEACHER');
  if (status) {
    teachers = teachers.filter(t => t.status === status);
  }
  res.json({ teachers });
});

function setTeacherStatus(status: 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'PENDING') {
  return (req: AuthRequest, res: any) => {
    const teacher = db.findUserById(req.params.id);
    if (!teacher || teacher.role !== 'TEACHER') {
      return res.status(404).json({ error: 'Teacher not found.' });
    }
    const updated = db.updateUserStatus(teacher.id, status);
    res.json({ user: updated });
  };
}

adminRouter.post('/teachers/:id/approve', setTeacherStatus('APPROVED'));
adminRouter.post('/teachers/:id/reject', setTeacherStatus('REJECTED'));
adminRouter.post('/teachers/:id/suspend', setTeacherStatus('SUSPENDED'));
adminRouter.post('/teachers/:id/reactivate', setTeacherStatus('APPROVED'));

// --- Student management ---
adminRouter.get('/students', (req: AuthRequest, res) => {
  const { status } = req.query as { status?: string };
  let students = db.getUsersByRole('STUDENT');
  if (status) {
    students = students.filter(s => s.status === status);
  }
  res.json({ students });
});

adminRouter.post('/students/:id/suspend', (req: AuthRequest, res) => {
  const student = db.findUserById(req.params.id);
  if (!student || student.role !== 'STUDENT') {
    return res.status(404).json({ error: 'Student not found.' });
  }
  const updated = db.updateUserStatus(student.id, 'SUSPENDED');
  res.json({ user: updated });
});

adminRouter.post('/students/:id/reactivate', (req: AuthRequest, res) => {
  const student = db.findUserById(req.params.id);
  if (!student || student.role !== 'STUDENT') {
    return res.status(404).json({ error: 'Student not found.' });
  }
  const updated = db.updateUserStatus(student.id, 'ACTIVE');
  res.json({ user: updated });
});

// --- Platform-level test management ---
adminRouter.get('/tests', (req: AuthRequest, res) => {
  res.json({ tests: db.getAllTests() });
});

adminRouter.post('/tests/:id/publish', (req: AuthRequest, res) => {
  const updated = db.updateTest(req.params.id, { status: 'PUBLISHED' });
  if (!updated) return res.status(404).json({ error: 'Test not found.' });
  res.json({ test: updated });
});

adminRouter.post('/tests/:id/unpublish', (req: AuthRequest, res) => {
  const updated = db.updateTest(req.params.id, { status: 'UNPUBLISHED' });
  if (!updated) return res.status(404).json({ error: 'Test not found.' });
  res.json({ test: updated });
});

adminRouter.delete('/tests/:id', (req: AuthRequest, res) => {
  const ok = db.deleteTest(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Test not found.' });
  res.json({ success: true });
});
