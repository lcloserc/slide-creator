import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { checkNameUnique } from '../lib/checkNameUnique';

export const generationPipelinesRouter = Router();

generationPipelinesRouter.get('/', async (_req, res) => {
  try {
    const pipelines = await prisma.generationPipeline.findMany({ orderBy: { createdAt: 'asc' } });
    res.json(pipelines);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch generation pipelines' });
  }
});

generationPipelinesRouter.post('/', async (req, res) => {
  try {
    const { name, pipelineData } = req.body;
    const finalName = name || 'New Pipeline';
    await checkNameUnique(finalName);
    const pipeline = await prisma.generationPipeline.create({
      data: { name: finalName, pipelineData: pipelineData || { steps: [] } },
    });
    res.status(201).json(pipeline);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create generation pipeline' });
  }
});

generationPipelinesRouter.get('/:id', async (req, res) => {
  try {
    const pipeline = await prisma.generationPipeline.findUnique({ where: { id: req.params.id } });
    if (!pipeline) return res.status(404).json({ error: 'Not found' });
    res.json(pipeline);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch generation pipeline' });
  }
});

generationPipelinesRouter.patch('/:id', async (req, res) => {
  try {
    const { name, pipelineData } = req.body;
    if (name !== undefined) await checkNameUnique(name, req.params.id);
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (pipelineData !== undefined) data.pipelineData = pipelineData;
    const pipeline = await prisma.generationPipeline.update({
      where: { id: req.params.id },
      data,
    });
    res.json(pipeline);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update generation pipeline' });
  }
});

generationPipelinesRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.generationPipeline.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete generation pipeline' });
  }
});
