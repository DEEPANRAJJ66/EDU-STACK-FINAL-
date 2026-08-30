import { Router } from 'express';
import { db } from '../db';
import { AuthRequest, requireTeacher } from '../auth';
import { TestFolder } from '../../src/types';

export const folderRouter = Router();

// Get all folders belonging to the logged-in teacher
folderRouter.get('/', requireTeacher, (req: AuthRequest, res) => {
  const folders = db.getFoldersByTeacher(req.user!.id);
  return res.json({ folders });
});

// Create a folder (optionally nested inside another folder via parentId)
folderRouter.post('/', requireTeacher, (req: AuthRequest, res) => {
  const { name, parentId = null } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Folder name is required.' });
  }

  if (parentId) {
    const parent = db.getFolderById(parentId);
    if (!parent || parent.teacherId !== req.user!.id) {
      return res.status(404).json({ error: 'Parent folder not found.' });
    }
  }

  const folderId = 'folder_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const newFolder: TestFolder = {
    id: folderId,
    teacherId: req.user!.id,
    name: name.trim(),
    parentId: parentId || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.createFolder(newFolder);
  return res.status(201).json({ folder: newFolder });
});

// Rename a folder and/or move it under a different parent folder
folderRouter.put('/:id', requireTeacher, (req: AuthRequest, res) => {
  const folder = db.getFolderById(req.params.id);
  if (!folder || folder.teacherId !== req.user!.id) {
    return res.status(404).json({ error: 'Folder not found.' });
  }

  const updates: { name?: string; parentId?: string | null } = {};

  if (req.body.name !== undefined) {
    if (!req.body.name.trim()) {
      return res.status(400).json({ error: 'Folder name cannot be empty.' });
    }
    updates.name = req.body.name.trim();
  }

  if (req.body.parentId !== undefined) {
    if (req.body.parentId) {
      const parent = db.getFolderById(req.body.parentId);
      if (!parent || parent.teacherId !== req.user!.id) {
        return res.status(404).json({ error: 'Destination folder not found.' });
      }
    }
    updates.parentId = req.body.parentId || null;
  }

  const result = db.updateFolder(req.params.id, updates);
  if (result === 'CYCLE') {
    return res.status(400).json({ error: 'Cannot move a folder into itself or one of its own subfolders.' });
  }
  return res.json({ folder: result });
});

// Delete a folder. Tests and subfolders inside it are relocated to its parent, never deleted.
folderRouter.delete('/:id', requireTeacher, (req: AuthRequest, res) => {
  const folder = db.getFolderById(req.params.id);
  if (!folder || folder.teacherId !== req.user!.id) {
    return res.status(404).json({ error: 'Folder not found.' });
  }
  db.deleteFolder(req.params.id);
  return res.json({ success: true });
});
