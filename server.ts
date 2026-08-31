import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { authenticate } from './backend/auth';
import { db } from './backend/db';
import { authRouter } from './backend/routes/authRoutes';
import { adminRouter } from './backend/routes/adminRoutes';
import { testRouter } from './backend/routes/testRoutes';
import { folderRouter } from './backend/routes/folderRoutes';
import { questionRouter } from './backend/routes/questionRoutes';
import { attemptRouter } from './backend/routes/attemptRoutes';
import { plannerRouter } from './backend/routes/plannerRoutes';

async function startServer() {
  // Wait for the database to finish loading (local seed file + any live user/attempt data
  // saved to Firestore from a previous run) before accepting any requests.
  await db.ready;

  const app = express();
  const PORT = 3000;

  // Middlewares
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(authenticate as any);

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), app: 'EduStack Test Series' });
  });

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/tests', testRouter);
  app.use('/api/folders', folderRouter);
  app.use('/api', questionRouter);
  app.use('/api/attempts', attemptRouter);
  app.use('/api/planner', plannerRouter);

  // Vite middleware for development or Static files for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.sendFile(path.join(__dirname, 'index.html'));
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[EduStack Test Series] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});