import { create } from 'zustand';
import { api } from '../lib/api';
import type {
  Project, Folder, Resource, GenerationPrompt, SystemPrompt,
  SlideTemplate, EditorTarget, PresentationData,
} from '../types';

interface AppState {
  projects: Project[];
  currentProjectId: string | null;
  folders: Folder[];
  resources: Resource[];
  generationPrompts: GenerationPrompt[];
  systemPrompts: SystemPrompt[];
  slideTemplates: SlideTemplate[];
  editorTarget: EditorTarget;
  generateDialogOpen: boolean;
  presentationMode: boolean;

  loadProjects: () => Promise<void>;
  setCurrentProject: (id: string | null) => void;
  createProject: (name: string) => Promise<Project>;
  renameProject: (id: string, name: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  loadProjectData: (projectId: string) => Promise<void>;
  createFolder: (name: string, parentId?: string) => Promise<void>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;

  createResource: (data: Partial<Resource>) => Promise<Resource>;
  updateResource: (id: string, data: Partial<Resource>) => Promise<void>;
  deleteResource: (id: string) => Promise<void>;
  uploadFile: (file: File, folderId?: string) => Promise<void>;
  uploadFiles: (files: File[], folderId?: string) => Promise<void>;

  loadProgramResources: () => Promise<void>;
  createGenerationPrompt: (data: Partial<GenerationPrompt>) => Promise<void>;
  updateGenerationPrompt: (id: string, data: Partial<GenerationPrompt>) => Promise<void>;
  deleteGenerationPrompt: (id: string) => Promise<void>;
  createSystemPrompt: (data: Partial<SystemPrompt>) => Promise<void>;
  updateSystemPrompt: (id: string, data: Partial<SystemPrompt>) => Promise<void>;
  deleteSystemPrompt: (id: string) => Promise<void>;
  createSlideTemplate: (data: Partial<SlideTemplate>) => Promise<void>;
  updateSlideTemplate: (id: string, data: Partial<SlideTemplate>) => Promise<void>;
  deleteSlideTemplate: (id: string) => Promise<void>;

  setEditorTarget: (target: EditorTarget) => void;
  setGenerateDialogOpen: (open: boolean) => void;
  setPresentationMode: (mode: boolean) => void;

  updatePresentationData: (resourceId: string, data: PresentationData) => void;
}

export const useStore = create<AppState>((set, get) => ({
  projects: [],
  currentProjectId: null,
  folders: [],
  resources: [],
  generationPrompts: [],
  systemPrompts: [],
  slideTemplates: [],
  editorTarget: { type: 'none' },
  generateDialogOpen: false,
  presentationMode: false,

  loadProjects: async () => {
    const projects = await api.projects.list();
    set({ projects });
  },

  setCurrentProject: (id) => {
    set({ currentProjectId: id, editorTarget: { type: 'none' } });
    if (id) get().loadProjectData(id);
  },

  createProject: async (name) => {
    const project = await api.projects.create(name);
    await get().loadProjects();
    return project;
  },

  renameProject: async (id, name) => {
    await api.projects.update(id, name);
    await get().loadProjects();
  },

  deleteProject: async (id) => {
    await api.projects.delete(id);
    const state = get();
    if (state.currentProjectId === id) {
      set({ currentProjectId: null, folders: [], resources: [], editorTarget: { type: 'none' } });
    }
    await get().loadProjects();
  },

  loadProjectData: async (projectId) => {
    const [folders, resources] = await Promise.all([
      api.folders.list(projectId),
      api.resources.list(projectId),
    ]);
    set({ folders, resources });
  },

  createFolder: async (name, parentId) => {
    const pid = get().currentProjectId;
    if (!pid) return;
    await api.folders.create(pid, name, parentId);
    await get().loadProjectData(pid);
  },

  renameFolder: async (id, name) => {
    await api.folders.update(id, { name });
    const pid = get().currentProjectId;
    if (pid) await get().loadProjectData(pid);
  },

  deleteFolder: async (id) => {
    await api.folders.delete(id);
    const pid = get().currentProjectId;
    if (pid) await get().loadProjectData(pid);
  },

  createResource: async (data) => {
    const pid = get().currentProjectId;
    if (!pid) throw new Error('No project selected');
    const resource = await api.resources.create(pid, data);
    await get().loadProjectData(pid);
    return resource;
  },

  updateResource: async (id, data) => {
    await api.resources.update(id, data);
    const pid = get().currentProjectId;
    if (pid) await get().loadProjectData(pid);
    const target = get().editorTarget;
    if (target.type === 'resource' && target.resource.id === id) {
      const updated = await api.resources.get(id);
      set({ editorTarget: { type: 'resource', resource: updated } });
    }
  },

  deleteResource: async (id) => {
    await api.resources.delete(id);
    const state = get();
    if (state.editorTarget.type === 'resource' && state.editorTarget.resource.id === id) {
      set({ editorTarget: { type: 'none' } });
    }
    const pid = state.currentProjectId;
    if (pid) await get().loadProjectData(pid);
  },

  uploadFile: async (file, folderId) => {
    const pid = get().currentProjectId;
    if (!pid) return;
    await api.upload(pid, file, folderId);
    await get().loadProjectData(pid);
  },

  uploadFiles: async (files, folderId) => {
    const pid = get().currentProjectId;
    if (!pid) return;
    for (const file of files) {
      await api.upload(pid, file, folderId);
    }
    await get().loadProjectData(pid);
  },

  loadProgramResources: async () => {
    const [generationPrompts, systemPrompts, slideTemplates] = await Promise.all([
      api.generationPrompts.list(),
      api.systemPrompts.list(),
      api.slideTemplates.list(),
    ]);
    set({ generationPrompts, systemPrompts, slideTemplates });
  },

  createGenerationPrompt: async (data) => {
    await api.generationPrompts.create(data);
    await get().loadProgramResources();
  },
  updateGenerationPrompt: async (id, data) => {
    await api.generationPrompts.update(id, data);
    await get().loadProgramResources();
    const target = get().editorTarget;
    if (target.type === 'generation_prompt' && target.item.id === id) {
      const updated = await api.generationPrompts.get(id);
      set({ editorTarget: { type: 'generation_prompt', item: updated } });
    }
  },
  deleteGenerationPrompt: async (id) => {
    await api.generationPrompts.delete(id);
    const target = get().editorTarget;
    if (target.type === 'generation_prompt' && target.item.id === id) {
      set({ editorTarget: { type: 'none' } });
    }
    await get().loadProgramResources();
  },

  createSystemPrompt: async (data) => {
    await api.systemPrompts.create(data);
    await get().loadProgramResources();
  },
  updateSystemPrompt: async (id, data) => {
    await api.systemPrompts.update(id, data);
    await get().loadProgramResources();
    const target = get().editorTarget;
    if (target.type === 'system_prompt' && target.item.id === id) {
      const updated = await api.systemPrompts.get(id);
      set({ editorTarget: { type: 'system_prompt', item: updated } });
    }
  },
  deleteSystemPrompt: async (id) => {
    await api.systemPrompts.delete(id);
    const target = get().editorTarget;
    if (target.type === 'system_prompt' && target.item.id === id) {
      set({ editorTarget: { type: 'none' } });
    }
    await get().loadProgramResources();
  },

  createSlideTemplate: async (data) => {
    await api.slideTemplates.create(data);
    await get().loadProgramResources();
  },
  updateSlideTemplate: async (id, data) => {
    await api.slideTemplates.update(id, data);
    await get().loadProgramResources();
    const target = get().editorTarget;
    if (target.type === 'slide_template' && target.item.id === id) {
      const updated = await api.slideTemplates.get(id);
      set({ editorTarget: { type: 'slide_template', item: updated } });
    }
  },
  deleteSlideTemplate: async (id) => {
    await api.slideTemplates.delete(id);
    const target = get().editorTarget;
    if (target.type === 'slide_template' && target.item.id === id) {
      set({ editorTarget: { type: 'none' } });
    }
    await get().loadProgramResources();
  },

  setEditorTarget: (target) => set({ editorTarget: target }),
  setGenerateDialogOpen: (open) => set({ generateDialogOpen: open }),
  setPresentationMode: (mode) => set({ presentationMode: mode }),

  updatePresentationData: (resourceId, data) => {
    set((state) => ({
      resources: state.resources.map((r) =>
        r.id === resourceId ? { ...r, contentJson: data } : r
      ),
      editorTarget:
        state.editorTarget.type === 'resource' && state.editorTarget.resource.id === resourceId
          ? { type: 'resource', resource: { ...state.editorTarget.resource, contentJson: data } }
          : state.editorTarget,
    }));
  },
}));
