import { Router } from 'express';
import { prisma } from '../lib/prisma';

export const foldersRouter = Router();

foldersRouter.get('/projects/:projectId/folders', async (req, res) => {
  try {
    const folders = await prisma.folder.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(folders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

foldersRouter.post('/projects/:projectId/folders', async (req, res) => {
  try {
    const { name, parentId } = req.body;
    const folder = await prisma.folder.create({
      data: {
        name: name || 'New Folder',
        projectId: req.params.projectId,
        parentId: parentId || null,
      },
    });
    res.status(201).json(folder);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

foldersRouter.patch('/folders/:id', async (req, res) => {
  try {
    const { name, parentId, sortOrder } = req.body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (parentId !== undefined) data.parentId = parentId;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    const folder = await prisma.folder.update({
      where: { id: req.params.id },
      data,
    });
    res.json(folder);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update folder' });
  }
});

foldersRouter.delete('/folders/:id', async (req, res) => {
  try {
    await prisma.folder.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});
