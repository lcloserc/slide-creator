import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { checkNameUnique } from '../lib/checkNameUnique';
import { invalidateFormatCache } from '../lib/resolveVariables';

export const outputFormatsRouter = Router();

outputFormatsRouter.get('/', async (_req, res) => {
  try {
    const formats = await prisma.outputFormat.findMany({ orderBy: { createdAt: 'asc' } });
    res.json(formats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch output formats' });
  }
});

outputFormatsRouter.post('/', async (req, res) => {
  try {
    const { name, content } = req.body;
    const finalName = name || 'New Format';
    await checkNameUnique(finalName);
    const format = await prisma.outputFormat.create({
      data: { name: finalName, content: content || '' },
    });
    invalidateFormatCache();
    res.status(201).json(format);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create output format' });
  }
});

outputFormatsRouter.get('/:id', async (req, res) => {
  try {
    const format = await prisma.outputFormat.findUnique({ where: { id: req.params.id } });
    if (!format) return res.status(404).json({ error: 'Not found' });
    res.json(format);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch output format' });
  }
});

outputFormatsRouter.patch('/:id', async (req, res) => {
  try {
    const { name, content } = req.body;
    if (name !== undefined) await checkNameUnique(name, req.params.id);
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (content !== undefined) data.content = content;
    const format = await prisma.outputFormat.update({
      where: { id: req.params.id },
      data,
    });
    invalidateFormatCache();
    res.json(format);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update output format' });
  }
});

outputFormatsRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.outputFormat.delete({ where: { id: req.params.id } });
    invalidateFormatCache();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete output format' });
  }
});
