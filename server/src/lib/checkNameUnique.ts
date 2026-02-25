import { prisma } from './prisma';

const TABLE_LABELS: Record<string, string> = {
  generationPrompt: 'generation prompt',
  systemPrompt: 'system prompt',
  outputFormat: 'output format',
  generationPipeline: 'generation pipeline',
};

export async function checkNameUnique(name: string, excludeId?: string): Promise<void> {
  const [gp, sp, of, gpl] = await Promise.all([
    prisma.generationPrompt.findUnique({ where: { name } }),
    prisma.systemPrompt.findUnique({ where: { name } }),
    prisma.outputFormat.findUnique({ where: { name } }),
    prisma.generationPipeline.findUnique({ where: { name } }),
  ]);

  const results: Array<[string, { id: string } | null]> = [
    ['generationPrompt', gp],
    ['systemPrompt', sp],
    ['outputFormat', of],
    ['generationPipeline', gpl],
  ];

  for (const [type, record] of results) {
    if (record && record.id !== excludeId) {
      throw new Error(`Name "${name}" is already used by a ${TABLE_LABELS[type]}`);
    }
  }
}
