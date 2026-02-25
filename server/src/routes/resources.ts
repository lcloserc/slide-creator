import { Router } from 'express';
import { prisma } from '../lib/prisma';

export const resourcesRouter = Router();

resourcesRouter.get('/projects/:projectId/resources', async (req, res) => {
  try {
    const resources = await prisma.resource.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { createdAt: 'asc' },
    });
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

resourcesRouter.post('/projects/:projectId/resources', async (req, res) => {
  try {
    const { name, resourceType, contentText, contentJson, folderId } = req.body;
    const resource = await prisma.resource.create({
      data: {
        name,
        resourceType,
        contentText: contentText || null,
        contentJson: contentJson || null,
        projectId: req.params.projectId,
        folderId: folderId || null,
      },
    });
    res.status(201).json(resource);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create resource' });
  }
});

resourcesRouter.get('/resources/:id', async (req, res) => {
  try {
    const resource = await prisma.resource.findUnique({ where: { id: req.params.id } });
    if (!resource) return res.status(404).json({ error: 'Resource not found' });
    res.json(resource);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch resource' });
  }
});

resourcesRouter.patch('/resources/:id', async (req, res) => {
  try {
    const { name, contentText, contentJson, folderId } = req.body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (contentText !== undefined) data.contentText = contentText;
    if (contentJson !== undefined) data.contentJson = contentJson;
    if (folderId !== undefined) data.folderId = folderId;

    const resource = await prisma.resource.update({
      where: { id: req.params.id },
      data,
    });
    res.json(resource);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update resource' });
  }
});

resourcesRouter.delete('/resources/:id', async (req, res) => {
  try {
    await prisma.resource.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete resource' });
  }
});
