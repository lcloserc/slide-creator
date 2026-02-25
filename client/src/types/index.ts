export interface Theme {
  backgroundColor: string;
  titleColor: string;
  accentColor: string;
  textColor: string;
  fontFamily: string;
}

export type Block =
  | { type: 'text'; content: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'numbered'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'quote'; content: string };

export interface Slide {
  id: string;
  title: string;
  blocks: Block[];
  notes: string;
}

export interface PresentationData {
  title: string;
  theme: Theme;
  slides: Slide[];
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  sortOrder: number;
  createdAt: string;
}

export interface Resource {
  id: string;
  projectId: string;
  folderId: string | null;
  name: string;
  resourceType: 'source_file' | 'presentation';
  contentText: string | null;
  contentJson: PresentationData | null;
  createdAt: string;
  updatedAt: string;
}

export interface GenerationPrompt {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface SystemPrompt {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface SlideTemplate {
  id: string;
  name: string;
  templateData: PresentationData;
  createdAt: string;
  updatedAt: string;
}

export const THEME_PRESETS: Record<string, Theme> = {
  dark: {
    backgroundColor: '#1A1A2E',
    titleColor: '#FFFFFF',
    accentColor: '#4EC9B0',
    textColor: '#E0E0E0',
    fontFamily: 'Inter',
  },
  light: {
    backgroundColor: '#FFFFFF',
    titleColor: '#1A1A2E',
    accentColor: '#2563EB',
    textColor: '#374151',
    fontFamily: 'Inter',
  },
  warm: {
    backgroundColor: '#FFF8F0',
    titleColor: '#3E2723',
    accentColor: '#E67E22',
    textColor: '#4E342E',
    fontFamily: 'Inter',
  },
  midnight: {
    backgroundColor: '#0D1117',
    titleColor: '#E6EDF3',
    accentColor: '#58A6FF',
    textColor: '#8B949E',
    fontFamily: 'Inter',
  },
};

export type EditorTarget =
  | { type: 'none' }
  | { type: 'resource'; resource: Resource }
  | { type: 'generation_prompt'; item: GenerationPrompt }
  | { type: 'system_prompt'; item: SystemPrompt }
  | { type: 'slide_template'; item: SlideTemplate };
