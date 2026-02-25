import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const uploadRouter = Router();

uploadRouter.post('/projects/:projectId/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const contentText = req.file.buffer.toString('utf-8');
    const rawFolderId = req.body.folderId;
    const folderId: string | null = typeof rawFolderId === 'string' && rawFolderId ? rawFolderId : null;
    const projectId: string = req.params.projectId as string;

    const resource = await prisma.resource.create({
      data: {
        name: req.file.originalname,
        resourceType: 'source_file',
        contentText,
        projectId,
        folderId,
      },
    });

    res.status(201).json(resource);
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload file' });
  }
});
