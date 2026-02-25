import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { api } from '../lib/api';

export function GenerateDialog() {
  const {
    generateDialogOpen, setGenerateDialogOpen,
    currentProjectId, projects, resources, folders,
    generationPrompts, systemPrompts, slideTemplates,
    setEditorTarget,
  } = useStore();

  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set());
  const [generationPromptId, setGenerationPromptId] = useState('');
  const [systemPromptId, setSystemPromptId] = useState('');
  const [slideTemplateId, setSlideTemplateId] = useState<string | null>(null);
  const [outputFolderId, setOutputFolderId] = useState<string | null>(null);
  const [outputName, setOutputName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (generateDialogOpen) {
      setSelectedSourceIds(new Set());
      setGenerationPromptId(generationPrompts[0]?.id || '');
      setSystemPromptId(systemPrompts[0]?.id || '');
      setSlideTemplateId(null);
      setOutputFolderId(null);
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const ts = `${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}:${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const projName = projects.find((p) => p.id === currentProjectId)?.name ?? 'Project';
      setOutputName(`${projName} - Presentation - Generated - ${ts}`);
      setError('');
    }
  }, [generateDialogOpen, generationPrompts, systemPrompts]);

  if (!generateDialogOpen || !currentProjectId) return null;

  const toggleSource = (id: string) => {
    setSelectedSourceIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedSourceIds(new Set(resources.map((r) => r.id)));
  const deselectAll = () => setSelectedSourceIds(new Set());

  const handleGenerate = async () => {
    if (!generationPromptId || !systemPromptId) {
      setError('Please select a generation prompt and system prompt.');
      return;
    }
    if (selectedSourceIds.size === 0) {
      setError('Please select at least one source file.');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const resource = await api.generate({
        projectId: currentProjectId,
        sourceResourceIds: Array.from(selectedSourceIds),
        generationPromptId,
        systemPromptId,
        slideTemplateId,
        outputFolderId,
        outputName,
      });

      await useStore.getState().loadProjectData(currentProjectId);
      const fullResource = await api.resources.get(resource.id);
      setEditorTarget({ type: 'resource', resource: fullResource });
      setGenerateDialogOpen(false);
    } catch (err: any) {
      setError(err.message || 'Generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const selectedGenPrompt = generationPrompts.find((p) => p.id === generationPromptId);
  const selectedSysPrompt = systemPrompts.find((p) => p.id === systemPromptId);

  const getFolderPath = (folderId: string | null): string => {
    if (!folderId) return '';
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return '';
    const parentPath = getFolderPath(folder.parentId);
    return parentPath ? `${parentPath}/${folder.name}` : folder.name;
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={() => !generating && setGenerateDialogOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Generate Presentation</h2>
              <button
                className="btn-icon"
                onClick={() => !generating && setGenerateDialogOpen(false)}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Source Material */}
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Source Material</label>
              <div className="flex gap-2 mb-2">
                <button className="text-xs text-blue-600 hover:underline" onClick={selectAll}>Select all</button>
                <button className="text-xs text-blue-600 hover:underline" onClick={deselectAll}>Deselect all</button>
              </div>
              <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                {resources.length === 0 ? (
                  <div className="p-3 text-sm text-gray-400 text-center">No resources in this project</div>
                ) : (
                  resources.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={selectedSourceIds.has(r.id)}
                        onChange={() => toggleSource(r.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">{r.folderId ? `${getFolderPath(r.folderId)}/` : ''}{r.name}</span>
                      <span className="text-xs text-gray-400 ml-auto">{r.resourceType === 'presentation' ? 'Presentation' : 'Source'}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Generation Prompt */}
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Generation Prompt</label>
              <select
                className="select"
                value={generationPromptId}
                onChange={(e) => setGenerationPromptId(e.target.value)}
              >
                <option value="">Select...</option>
                {generationPrompts.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {selectedGenPrompt && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 max-h-24 overflow-y-auto font-mono whitespace-pre-wrap">
                  {selectedGenPrompt.content.substring(0, 300)}{selectedGenPrompt.content.length > 300 ? '...' : ''}
                </div>
              )}
            </div>

            {/* System Prompt */}
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">System Prompt</label>
              <select
                className="select"
                value={systemPromptId}
                onChange={(e) => setSystemPromptId(e.target.value)}
              >
                <option value="">Select...</option>
                {systemPrompts.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {selectedSysPrompt && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 max-h-24 overflow-y-auto font-mono whitespace-pre-wrap">
                  {selectedSysPrompt.content}
                </div>
              )}
            </div>

            {/* Slide Template */}
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Slide Template (optional)</label>
              <select
                className="select"
                value={slideTemplateId || ''}
                onChange={(e) => setSlideTemplateId(e.target.value || null)}
              >
                <option value="">None</option>
                {slideTemplates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Output Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Output Folder</label>
                <select
                  className="select"
                  value={outputFolderId || ''}
                  onChange={(e) => setOutputFolderId(e.target.value || null)}
                >
                  <option value="">Project root</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>{getFolderPath(f.id) || f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Output Name</label>
                <input
                  className="input"
                  value={outputName}
                  onChange={(e) => setOutputName(e.target.value)}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
            <button
              className="btn-secondary"
              onClick={() => setGenerateDialogOpen(false)}
              disabled={generating}
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
