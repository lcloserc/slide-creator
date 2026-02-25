const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.rawResponse || 'Request failed');
  }
  return res.json();
}

export const api = {
  projects: {
    list: () => request<any[]>('/projects'),
    create: (name: string) => request<any>('/projects', { method: 'POST', body: JSON.stringify({ name }) }),
    update: (id: string, name: string) => request<any>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
    delete: (id: string) => request<any>(`/projects/${id}`, { method: 'DELETE' }),
  },
  folders: {
    list: (projectId: string) => request<any[]>(`/projects/${projectId}/folders`),
    create: (projectId: string, name: string, parentId?: string) =>
      request<any>(`/projects/${projectId}/folders`, { method: 'POST', body: JSON.stringify({ name, parentId }) }),
    update: (id: string, data: any) => request<any>(`/folders/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/folders/${id}`, { method: 'DELETE' }),
  },
  resources: {
    list: (projectId: string) => request<any[]>(`/projects/${projectId}/resources`),
    get: (id: string) => request<any>(`/resources/${id}`),
    create: (projectId: string, data: any) =>
      request<any>(`/projects/${projectId}/resources`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/resources/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/resources/${id}`, { method: 'DELETE' }),
  },
  generationPrompts: {
    list: () => request<any[]>('/generation-prompts'),
    get: (id: string) => request<any>(`/generation-prompts/${id}`),
    create: (data: any) => request<any>('/generation-prompts', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/generation-prompts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/generation-prompts/${id}`, { method: 'DELETE' }),
  },
  systemPrompts: {
    list: () => request<any[]>('/system-prompts'),
    get: (id: string) => request<any>(`/system-prompts/${id}`),
    create: (data: any) => request<any>('/system-prompts', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/system-prompts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/system-prompts/${id}`, { method: 'DELETE' }),
  },
  slideTemplates: {
    list: () => request<any[]>('/slide-templates'),
    get: (id: string) => request<any>(`/slide-templates/${id}`),
    create: (data: any) => request<any>('/slide-templates', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/slide-templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/slide-templates/${id}`, { method: 'DELETE' }),
  },
  generate: (data: any) => request<any>('/generate', { method: 'POST', body: JSON.stringify(data) }),
  upload: async (projectId: string, file: File, folderId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) formData.append('folderId', folderId);
    const res = await fetch(`${BASE}/projects/${projectId}/upload`, { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },
};
