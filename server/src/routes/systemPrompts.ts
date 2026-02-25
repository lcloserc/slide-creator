import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { checkNameUnique } from '../lib/checkNameUnique';

export const systemPromptsRouter = Router();

systemPromptsRouter.get('/', async (_req, res) => {
  try {
    const prompts = await prisma.systemPrompt.findMany({ orderBy: { createdAt: 'asc' } });
    res.json(prompts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch system prompts' });
  }
});

systemPromptsRouter.post('/', async (req, res) => {
  try {
    const { name, content, folder } = req.body;
    const finalName = name || 'New System Prompt';
    await checkNameUnique(finalName);
    const prompt = await prisma.systemPrompt.create({
      data: { name: finalName, content: content || '', folder: folder || null },
    });
    res.status(201).json(prompt);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create system prompt' });
  }
});

systemPromptsRouter.get('/:id', async (req, res) => {
  try {
    const prompt = await prisma.systemPrompt.findUnique({ where: { id: req.params.id } });
    if (!prompt) return res.status(404).json({ error: 'Not found' });
    res.json(prompt);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch system prompt' });
  }
});

systemPromptsRouter.patch('/:id', async (req, res) => {
  try {
    const { name, content, folder } = req.body;
    if (name !== undefined) await checkNameUnique(name, req.params.id);
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (content !== undefined) data.content = content;
    if (folder !== undefined) data.folder = folder;
    const prompt = await prisma.systemPrompt.update({
      where: { id: req.params.id },
      data,
    });
    res.json(prompt);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update system prompt' });
  }
});

systemPromptsRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.systemPrompt.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete system prompt' });
  }
});
