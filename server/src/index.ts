import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { projectsRouter } from './routes/projects';
import { foldersRouter } from './routes/folders';
import { resourcesRouter } from './routes/resources';
import { generationPromptsRouter } from './routes/generationPrompts';
import { systemPromptsRouter } from './routes/systemPrompts';
import { slideTemplatesRouter } from './routes/slideTemplates';
import { generateRouter } from './routes/generate';
import { uploadRouter } from './routes/upload';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api/projects', projectsRouter);
app.use('/api', foldersRouter);
app.use('/api', resourcesRouter);
app.use('/api/generation-prompts', generationPromptsRouter);
app.use('/api/system-prompts', systemPromptsRouter);
app.use('/api/slide-templates', slideTemplatesRouter);
app.use('/api/generate', generateRouter);
app.use('/api', uploadRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
