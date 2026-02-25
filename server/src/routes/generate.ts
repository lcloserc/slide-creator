import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { resolveVariables } from '../lib/resolveVariables';
import OpenAI from 'openai';

export const generateRouter = Router();

generateRouter.post('/', async (req, res) => {
  try {
    const {
      projectId,
      sourceResourceIds,
      generationPromptId,
      systemPromptId,
      outputFolderId,
      outputName,
    } = req.body;

    const [sourceResources, generationPrompt, systemPrompt] = await Promise.all([
      prisma.resource.findMany({ where: { id: { in: sourceResourceIds } } }),
      prisma.generationPrompt.findUnique({ where: { id: generationPromptId } }),
      prisma.systemPrompt.findUnique({ where: { id: systemPromptId } }),
    ]);

    if (!generationPrompt) {
      return res.status(400).json({ error: 'Generation prompt not found' });
    }
    if (!systemPrompt) {
      return res.status(400).json({ error: 'System prompt not found' });
    }

    let userContent = '';

    for (const resource of sourceResources) {
      const text = resource.contentText || JSON.stringify(resource.contentJson, null, 2);
      userContent += `=== SOURCE: ${resource.name} ===\n${text}\n\n`;
    }

    userContent += await resolveVariables(generationPrompt.content);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const resolvedSystemContent = await resolveVariables(systemPrompt.content);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: resolvedSystemContent },
        { role: 'user', content: userContent },
      ],
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      return res.status(500).json({ error: 'Empty response from OpenAI' });
    }

    let presentationData: unknown;
    try {
      presentationData = JSON.parse(responseText);
    } catch {
      return res.status(500).json({
        error: 'Failed to parse OpenAI response as JSON',
        rawResponse: responseText,
      });
    }

    const data = presentationData as Record<string, unknown>;
    if (!data.slides || !Array.isArray(data.slides)) {
      return res.status(500).json({
        error: 'Invalid presentation structure: missing slides array',
        rawResponse: responseText,
      });
    }

    if (!data._format) {
      data._format = 'slidecreator/presentation/v1';
    }

    const resource = await prisma.resource.create({
      data: {
        name: outputName || `Generated — ${new Date().toLocaleString()}`,
        resourceType: 'presentation',
        contentJson: data as any,
        projectId,
        folderId: outputFolderId || null,
      },
    });

    res.status(201).json(resource);
  } catch (err: any) {
    console.error('Generation error:', err);
    res.status(500).json({
      error: err.message || 'Generation failed',
    });
  }
});
