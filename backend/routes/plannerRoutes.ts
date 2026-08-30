import { Router } from 'express';
import { db } from '../db';
import { AuthRequest, requireAuth } from '../auth';

export const plannerRouter = Router();

// GET /api/planner/tasks
// Fetch tasks for the authenticated student (or specified studentId)
plannerRouter.get('/tasks', requireAuth, (req: AuthRequest, res) => {
  try {
    const studentId = (req.query.studentId as string) || req.user?.id || 'user_student_1';
    const date = req.query.date as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const tasks = db.getPlannerTasksByStudent(studentId, { date, startDate, endDate });
    return res.json({ tasks });
  } catch (err: any) {
    console.error('Error fetching planner tasks:', err);
    return res.status(500).json({ error: 'Failed to fetch planner tasks' });
  }
});

// GET /api/planner/tasks/:id
plannerRouter.get('/tasks/:id', requireAuth, (req: AuthRequest, res) => {
  try {
    const task = db.getPlannerTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    return res.json({ task });
  } catch (err: any) {
    console.error('Error fetching planner task by id:', err);
    return res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// POST /api/planner/tasks
// Create a new task
plannerRouter.post('/tasks', requireAuth, (req: AuthRequest, res) => {
  try {
    const studentId = req.body.studentId || req.user?.id || 'user_student_1';
    const studentName = req.body.studentName || req.user?.name || 'Student';
    const { title, date, day, startTime, plannedDurationMinutes, priority } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const newTask = db.createPlannerTask({
      studentId,
      studentName,
      title,
      date,
      day,
      startTime: startTime || '09:00',
      plannedDurationMinutes: plannedDurationMinutes ? Number(plannedDurationMinutes) : 30,
      priority: priority || 'MEDIUM',
    });

    return res.status(201).json({ task: newTask, message: 'Task created successfully' });
  } catch (err: any) {
    console.error('Error creating planner task:', err);
    return res.status(500).json({ error: 'Failed to create planner task' });
  }
});

// PUT /api/planner/tasks/:id
// Update task (status, reflection, actual duration, timer state, etc.)
plannerRouter.put('/tasks/:id', requireAuth, (req: AuthRequest, res) => {
  try {
    const studentId = (req.body.studentId as string) || req.user?.id || 'user_student_1';
    const taskId = req.params.id;

    const updated = db.updatePlannerTask(taskId, studentId, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Task not found or unauthorized' });
    }

    return res.json({ task: updated, message: 'Task updated successfully' });
  } catch (err: any) {
    console.error('Error updating planner task:', err);
    return res.status(500).json({ error: 'Failed to update planner task' });
  }
});

// DELETE /api/planner/tasks/:id
plannerRouter.delete('/tasks/:id', requireAuth, (req: AuthRequest, res) => {
  try {
    const studentId = (req.query.studentId as string) || req.user?.id || 'user_student_1';
    const taskId = req.params.id;

    const deleted = db.deletePlannerTask(taskId, studentId);
    if (!deleted) {
      return res.status(404).json({ error: 'Task not found or could not be deleted' });
    }

    return res.json({ success: true, message: 'Task deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting planner task:', err);
    return res.status(500).json({ error: 'Failed to delete planner task' });
  }
});

// GET /api/planner/analytics
// Compute day, week, month analytics for student
plannerRouter.get('/analytics', requireAuth, (req: AuthRequest, res) => {
  try {
    const studentId = (req.query.studentId as string) || req.user?.id || 'user_student_1';
    const clientDate = req.query.clientDate as string | undefined;

    const analytics = db.getPlannerAnalytics(studentId, clientDate);
    return res.json({ analytics });
  } catch (err: any) {
    console.error('Error computing planner analytics:', err);
    return res.status(500).json({ error: 'Failed to compute planner analytics' });
  }
});
