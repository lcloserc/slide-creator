import { prisma } from './prisma';

let cachedFormats: Map<string, string> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000;

async function loadFormats(): Promise<Map<string, string>> {
  const now = Date.now();
  if (cachedFormats && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedFormats;
  }
  const formats = await prisma.outputFormat.findMany();
  cachedFormats = new Map(formats.map((f) => [f.name, f.content]));
  cacheTimestamp = now;
  return cachedFormats;
}

export function invalidateFormatCache() {
  cachedFormats = null;
}

export async function resolveVariables(text: string): Promise<string> {
  if (!text.includes('{{')) return text;
  const formats = await loadFormats();
  return text.replace(/\{\{([^}]+)\}\}/g, (match, name) => {
    return formats.get(name) ?? match;
  });
}
