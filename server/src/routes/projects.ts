import { Router } from 'express';
import { prisma } from '../lib/prisma';

export const projectsRouter = Router();

projectsRouter.get('/', async (_req, res) => {
  try {
    const projects = await prisma.project.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

projectsRouter.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    const fallback = `Project ${Date.now().toString(36).slice(-5)}`;
    const project = await prisma.project.create({ data: { name: name || fallback } });
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

projectsRouter.patch('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { name },
    });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

projectsRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});
