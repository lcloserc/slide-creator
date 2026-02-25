/**
 * Seed script: reads database/seeds/manifest.json and the referenced content files,
 * then upserts all program-level resources into the database via Prisma.
 *
 * Run from the project root:
 *   npx tsx database/seed.ts
 *
 * Requires the Prisma client to be generated first (npx prisma generate in server/).
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const SEEDS_DIR = path.join(__dirname, 'seeds');

interface ManifestOutputFormat {
  id: string;
  name: string;
  file: string;
}

interface ManifestPrompt {
  id: string;
  name: string;
  folder: string | null;
  file: string;
}

interface ManifestPipeline {
  id: string;
  name: string;
  file: string;
}

interface Manifest {
  output_formats: ManifestOutputFormat[];
  generation_prompts: ManifestPrompt[];
  system_prompts: ManifestPrompt[];
  generation_pipelines: ManifestPipeline[];
}

function readContent(filePath: string): string {
  return fs.readFileSync(path.join(SEEDS_DIR, filePath), 'utf-8');
}

function readJson(filePath: string): unknown {
  return JSON.parse(readContent(filePath));
}

async function main() {
  const manifest: Manifest = JSON.parse(
    fs.readFileSync(path.join(SEEDS_DIR, 'manifest.json'), 'utf-8')
  );

  console.log('Seeding output formats...');
  for (const entry of manifest.output_formats) {
    const content = readContent(entry.file);
    await prisma.outputFormat.upsert({
      where: { id: entry.id },
      create: { id: entry.id, name: entry.name, content },
      update: { name: entry.name, content },
    });
    console.log(`  ✓ ${entry.name}`);
  }

  console.log('Seeding generation prompts...');
  for (const entry of manifest.generation_prompts) {
    const content = readContent(entry.file);
    await prisma.generationPrompt.upsert({
      where: { id: entry.id },
      create: { id: entry.id, name: entry.name, content, folder: entry.folder },
      update: { name: entry.name, content, folder: entry.folder },
    });
    console.log(`  ✓ ${entry.name}`);
  }

  console.log('Seeding system prompts...');
  for (const entry of manifest.system_prompts) {
    const content = readContent(entry.file);
    await prisma.systemPrompt.upsert({
      where: { id: entry.id },
      create: { id: entry.id, name: entry.name, content, folder: entry.folder },
      update: { name: entry.name, content, folder: entry.folder },
    });
    console.log(`  ✓ ${entry.name}`);
  }

  console.log('Seeding generation pipelines...');
  for (const entry of manifest.generation_pipelines) {
    const pipelineData = readJson(entry.file);
    await prisma.generationPipeline.upsert({
      where: { id: entry.id },
      create: { id: entry.id, name: entry.name, pipelineData: pipelineData as any },
      update: { name: entry.name, pipelineData: pipelineData as any },
    });
    console.log(`  ✓ ${entry.name}`);
  }

  console.log('Seed complete.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
