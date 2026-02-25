import { Router } from 'express';
import { prisma } from '../lib/prisma';

export const slideTemplatesRouter = Router();

slideTemplatesRouter.get('/', async (_req, res) => {
  try {
    const templates = await prisma.slideTemplate.findMany({ orderBy: { createdAt: 'asc' } });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch slide templates' });
  }
});

slideTemplatesRouter.post('/', async (req, res) => {
  try {
    const { name, templateData } = req.body;
    const template = await prisma.slideTemplate.create({
      data: { name: name || 'New Template', templateData: templateData || {} },
    });
    res.status(201).json(template);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create slide template' });
  }
});

slideTemplatesRouter.get('/:id', async (req, res) => {
  try {
    const template = await prisma.slideTemplate.findUnique({ where: { id: req.params.id } });
    if (!template) return res.status(404).json({ error: 'Not found' });
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch slide template' });
  }
});

slideTemplatesRouter.patch('/:id', async (req, res) => {
  try {
    const { name, templateData } = req.body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (templateData !== undefined) data.templateData = templateData;
    const template = await prisma.slideTemplate.update({
      where: { id: req.params.id },
      data,
    });
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update slide template' });
  }
});

slideTemplatesRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.slideTemplate.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete slide template' });
  }
});
