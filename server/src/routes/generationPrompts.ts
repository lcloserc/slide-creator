import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { checkNameUnique } from '../lib/checkNameUnique';

export const generationPromptsRouter = Router();

generationPromptsRouter.get('/', async (_req, res) => {
  try {
    const prompts = await prisma.generationPrompt.findMany({ orderBy: { createdAt: 'asc' } });
    res.json(prompts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch generation prompts' });
  }
});

generationPromptsRouter.post('/', async (req, res) => {
  try {
    const { name, content, folder } = req.body;
    const finalName = name || 'New Prompt';
    await checkNameUnique(finalName);
    const prompt = await prisma.generationPrompt.create({
      data: { name: finalName, content: content || '', folder: folder || null },
    });
    res.status(201).json(prompt);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create generation prompt' });
  }
});

generationPromptsRouter.get('/:id', async (req, res) => {
  try {
    const prompt = await prisma.generationPrompt.findUnique({ where: { id: req.params.id } });
    if (!prompt) return res.status(404).json({ error: 'Not found' });
    res.json(prompt);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch generation prompt' });
  }
});

generationPromptsRouter.patch('/:id', async (req, res) => {
  try {
    const { name, content, folder } = req.body;
    if (name !== undefined) await checkNameUnique(name, req.params.id);
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (content !== undefined) data.content = content;
    if (folder !== undefined) data.folder = folder;
    const prompt = await prisma.generationPrompt.update({
      where: { id: req.params.id },
      data,
    });
    res.json(prompt);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update generation prompt' });
  }
});

generationPromptsRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.generationPrompt.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete generation prompt' });
  }
});
