import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { resolveVariables } from '../lib/resolveVariables';
import OpenAI from 'openai';

export const pipelineRunsRouter = Router();

interface StepSource {
  type: 'project_resources' | 'step_output' | 'all_step_outputs';
  step?: number;
}

interface PipelineStep {
  name: string;
  generationPrompt?: string;
  generationPromptInline?: string;
  systemPrompt?: string;
  systemPromptInline?: string;
  sources: StepSource[];
  saveToProject: boolean;
  outputNameTemplate?: string;
  isFinal?: boolean;
}

interface PipelineDefinition {
  steps: PipelineStep[];
}

interface StepResult {
  stepIndex: number;
  stepName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  resourceId?: string;
  error?: string;
}

function resolveOutputName(template: string | undefined, fallback: string, vars: Record<string, string>): string {
  if (!template) return fallback;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '');
}

// POST /api/pipeline-runs — kick off a pipeline run
pipelineRunsRouter.post('/', async (req, res) => {
  try {
    const { pipelineId, projectId, sourceResourceIds, outputFolderId } = req.body;

    const pipeline = await prisma.generationPipeline.findUnique({ where: { id: pipelineId } });
    if (!pipeline) return res.status(400).json({ error: 'Pipeline not found' });

    const pipelineData = pipeline.pipelineData as unknown as PipelineDefinition;
    if (!pipelineData.steps || pipelineData.steps.length === 0) {
      return res.status(400).json({ error: 'Pipeline has no steps' });
    }

    const stepResults: StepResult[] = pipelineData.steps.map((step, i) => ({
      stepIndex: i,
      stepName: step.name,
      status: 'pending' as const,
    }));

    const run = await prisma.pipelineRun.create({
      data: {
        pipelineId,
        projectId,
        status: 'running',
        currentStep: 0,
        totalSteps: pipelineData.steps.length,
        stepResults: stepResults as any,
        outputFolderId: outputFolderId || null,
        sourceResourceIds: sourceResourceIds as any,
      },
    });

    // Fire-and-forget: execute in background
    executePipeline(run.id, pipelineData, projectId, sourceResourceIds, outputFolderId).catch((err) => {
      console.error(`Pipeline run ${run.id} uncaught error:`, err);
    });

    res.status(201).json(run);
  } catch (err: any) {
    console.error('Pipeline run creation error:', err);
    res.status(500).json({ error: err.message || 'Failed to start pipeline run' });
  }
});

// GET /api/pipeline-runs/:id — poll for status
pipelineRunsRouter.get('/:id', async (req, res) => {
  try {
    const run = await prisma.pipelineRun.findUnique({ where: { id: req.params.id } });
    if (!run) return res.status(404).json({ error: 'Pipeline run not found' });
    res.json(run);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pipeline run' });
  }
});

async function executePipeline(
  runId: string,
  pipelineData: PipelineDefinition,
  projectId: string,
  sourceResourceIds: string[],
  outputFolderId: string | null,
) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const sourceResources = await prisma.resource.findMany({
    where: { id: { in: sourceResourceIds } },
  });

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  const projectName = project?.name || 'Project';

  // In-memory store for step outputs (raw response text/JSON)
  const stepOutputs: Map<number, string> = new Map();
  let finalResourceId: string | null = null;

  for (let i = 0; i < pipelineData.steps.length; i++) {
    const step = pipelineData.steps[i];

    try {
      // Mark step as running
      await updateStepStatus(runId, i, 'running');
      await prisma.pipelineRun.update({
        where: { id: runId },
        data: { currentStep: i },
      });

      // Resolve system prompt
      let systemContent: string;
      if (step.systemPromptInline) {
        systemContent = step.systemPromptInline;
      } else if (step.systemPrompt) {
        const sp = await prisma.systemPrompt.findUnique({ where: { name: step.systemPrompt } });
        if (!sp) throw new Error(`System prompt not found: "${step.systemPrompt}"`);
        systemContent = sp.content;
      } else {
        throw new Error(`Step "${step.name}" has no system prompt`);
      }

      // Resolve generation prompt
      let generationContent: string;
      if (step.generationPromptInline) {
        generationContent = step.generationPromptInline;
      } else if (step.generationPrompt) {
        const gp = await prisma.generationPrompt.findUnique({ where: { name: step.generationPrompt } });
        if (!gp) throw new Error(`Generation prompt not found: "${step.generationPrompt}"`);
        generationContent = gp.content;
      } else {
        throw new Error(`Step "${step.name}" has no generation prompt`);
      }

      // Build user message from sources
      let userContent = '';

      for (const source of step.sources) {
        if (source.type === 'project_resources') {
          for (const resource of sourceResources) {
            const text = resource.contentText || JSON.stringify(resource.contentJson, null, 2);
            userContent += `=== SOURCE: ${resource.name} ===\n${text}\n\n`;
          }
        } else if (source.type === 'step_output') {
          const stepIdx = source.step!;
          const output = stepOutputs.get(stepIdx);
          if (output) {
            const stepName = pipelineData.steps[stepIdx]?.name || `Step ${stepIdx}`;
            userContent += `=== OUTPUT FROM STEP "${stepName}" ===\n${output}\n\n`;
          }
        } else if (source.type === 'all_step_outputs') {
          for (const [stepIdx, output] of stepOutputs.entries()) {
            const stepName = pipelineData.steps[stepIdx]?.name || `Step ${stepIdx}`;
            userContent += `=== OUTPUT FROM STEP "${stepName}" ===\n${output}\n\n`;
          }
        }
      }

      userContent += await resolveVariables(generationContent);
      systemContent = await resolveVariables(systemContent);

      // Call OpenAI
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userContent },
        ],
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('Empty response from OpenAI');
      }

      // Store raw response for later steps
      stepOutputs.set(i, responseText);

      let resourceId: string | undefined;

      // Save to project if requested
      if (step.saveToProject) {
        let parsedResponse: unknown;
        try {
          parsedResponse = JSON.parse(responseText);
        } catch {
          parsedResponse = null;
        }

        const isPresentation = parsedResponse && typeof parsedResponse === 'object' &&
          'slides' in (parsedResponse as Record<string, unknown>) &&
          Array.isArray((parsedResponse as any).slides);

        if (isPresentation && !(parsedResponse as any)._format) {
          (parsedResponse as any)._format = 'slidecreator/presentation/v1';
        }

        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const ts = `${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}:${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

        const outputName = resolveOutputName(step.outputNameTemplate, `${projectName} - ${step.name}`, {
          project: projectName,
          step: step.name,
          timestamp: ts,
        });

        const resource = await prisma.resource.create({
          data: {
            name: outputName,
            resourceType: isPresentation ? 'presentation' : 'source_file',
            contentJson: isPresentation ? (parsedResponse as any) : undefined,
            contentText: isPresentation ? undefined : responseText,
            projectId,
            folderId: outputFolderId || null,
          },
        });

        resourceId = resource.id;

        if (step.isFinal) {
          finalResourceId = resource.id;
        }
      }

      await updateStepStatus(runId, i, 'completed', resourceId);

    } catch (err: any) {
      console.error(`Pipeline step ${i} ("${step.name}") failed:`, err);
      await updateStepStatus(runId, i, 'failed', undefined, err.message || 'Step failed');

      await prisma.pipelineRun.update({
        where: { id: runId },
        data: {
          status: 'failed',
          error: `Step "${step.name}" failed: ${err.message || 'Unknown error'}`,
          completedAt: new Date(),
        },
      });
      return;
    }
  }

  // All steps completed
  await prisma.pipelineRun.update({
    where: { id: runId },
    data: {
      status: 'completed',
      finalResourceId,
      completedAt: new Date(),
    },
  });
}

async function updateStepStatus(
  runId: string,
  stepIndex: number,
  status: StepResult['status'],
  resourceId?: string,
  error?: string,
) {
  const run = await prisma.pipelineRun.findUnique({ where: { id: runId } });
  if (!run) return;

  const stepResults = (run.stepResults as unknown as StepResult[]) || [];
  if (stepResults[stepIndex]) {
    stepResults[stepIndex].status = status;
    if (resourceId) stepResults[stepIndex].resourceId = resourceId;
    if (error) stepResults[stepIndex].error = error;
  }

  await prisma.pipelineRun.update({
    where: { id: runId },
    data: { stepResults: stepResults as any },
  });
}
