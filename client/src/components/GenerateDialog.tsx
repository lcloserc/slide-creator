import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';
import { api } from '../lib/api';
import type { PipelineRun, StepResult } from '../types';
import { isPresentation } from '../types';

type Mode = 'single' | 'pipeline';

export function GenerateDialog() {
  const {
    generateDialogOpen, setGenerateDialogOpen,
    currentProjectId, projects, resources, folders,
    generationPrompts, systemPrompts, generationPipelines,
    setEditorTarget,
  } = useStore();

  const [mode, setMode] = useState<Mode>('single');
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set());
  const [generationPromptId, setGenerationPromptId] = useState('');
  const [systemPromptId, setSystemPromptId] = useState('');
  const [outputFolderId, setOutputFolderId] = useState<string | null>(null);
  const [outputName, setOutputName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Pipeline mode state
  const [pipelineId, setPipelineId] = useState('');
  const [pipelineRun, setPipelineRun] = useState<PipelineRun | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (generateDialogOpen) {
      setMode('single');
      setSelectedSourceIds(new Set());
      setGenerationPromptId(generationPrompts[0]?.id || '');
      setSystemPromptId(systemPrompts[0]?.id || '');
      setOutputFolderId(null);
      setPipelineId(generationPipelines[0]?.id || '');
      setPipelineRun(null);
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const ts = `${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}:${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const projName = projects.find((p) => p.id === currentProjectId)?.name ?? 'Project';
      setOutputName(`${projName} - Presentation - Generated - ${ts}`);
      setError('');
    } else {
      stopPolling();
    }
  }, [generateDialogOpen, generationPrompts, systemPrompts, generationPipelines, stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

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
    if (selectedSourceIds.size === 0) {
      setError('Please select at least one source file.');
      return;
    }

    if (mode === 'single') {
      if (!generationPromptId || !systemPromptId) {
        setError('Please select a generation prompt and system prompt.');
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
    } else {
      if (!pipelineId) {
        setError('Please select a pipeline.');
        return;
      }
      setGenerating(true);
      setError('');
      setPipelineRun(null);
      try {
        const run: PipelineRun = await api.pipelineRuns.create({
          pipelineId,
          projectId: currentProjectId,
          sourceResourceIds: Array.from(selectedSourceIds),
          outputFolderId,
        });
        setPipelineRun(run);
        startPolling(run.id);
      } catch (err: any) {
        setError(err.message || 'Failed to start pipeline.');
        setGenerating(false);
      }
    }
  };

  const startPolling = (runId: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const run: PipelineRun = await api.pipelineRuns.get(runId);
        setPipelineRun(run);
        if (run.status === 'completed' || run.status === 'failed') {
          stopPolling();
          setGenerating(false);
          if (run.status === 'completed') {
            await useStore.getState().loadProjectData(currentProjectId!);
            if (run.finalResourceId) {
              const fullResource = await api.resources.get(run.finalResourceId);
              setEditorTarget({ type: 'resource', resource: fullResource });
            }
            setGenerateDialogOpen(false);
          } else {
            setError(run.error || 'Pipeline failed.');
          }
        }
      } catch {
        // polling error — just retry next interval
      }
    }, 2000);
  };

  const selectedGenPrompt = generationPrompts.find((p) => p.id === generationPromptId);
  const selectedSysPrompt = systemPrompts.find((p) => p.id === systemPromptId);
  const selectedPipeline = generationPipelines.find((p) => p.id === pipelineId);

  const getFolderPath = (folderId: string | null): string => {
    if (!folderId) return '';
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return '';
    const parentPath = getFolderPath(folder.parentId);
    return parentPath ? `${parentPath}/${folder.name}` : folder.name;
  };

  const stepStatusIcon = (status: StepResult['status']) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'running':
        return (
          <svg className="w-4 h-4 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
    }
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
            {/* Mode toggle */}
            <div className="flex mt-4 bg-gray-100 rounded-lg p-1">
              <button
                className={`flex-1 py-1.5 px-3 text-sm font-medium rounded-md transition-colors ${mode === 'single' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => !generating && setMode('single')}
              >
                Single Generation
              </button>
              <button
                className={`flex-1 py-1.5 px-3 text-sm font-medium rounded-md transition-colors ${mode === 'pipeline' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => !generating && setMode('pipeline')}
              >
                Pipeline
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Source Material (shared) */}
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
                      <span className="text-xs text-gray-400 ml-auto">{isPresentation(r) ? 'Presentation' : 'Source'}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {mode === 'single' ? (
              <>
                {/* Generation Prompt */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">Generation Prompt</label>
                  <select className="select" value={generationPromptId} onChange={(e) => setGenerationPromptId(e.target.value)}>
                    <option value="">Select...</option>
                    {generationPrompts.map((p) => (
                      <option key={p.id} value={p.id}>{p.folder ? `${p.folder} / ` : ''}{p.name}</option>
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
                  <select className="select" value={systemPromptId} onChange={(e) => setSystemPromptId(e.target.value)}>
                    <option value="">Select...</option>
                    {systemPrompts.map((p) => (
                      <option key={p.id} value={p.id}>{p.folder ? `${p.folder} / ` : ''}{p.name}</option>
                    ))}
                  </select>
                  {selectedSysPrompt && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 max-h-24 overflow-y-auto font-mono whitespace-pre-wrap">
                      {selectedSysPrompt.content}
                    </div>
                  )}
                </div>

                {/* Output Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-2">Output Folder</label>
                    <select className="select" value={outputFolderId || ''} onChange={(e) => setOutputFolderId(e.target.value || null)}>
                      <option value="">Project root</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>{getFolderPath(f.id) || f.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-2">Output Name</label>
                    <input className="input" value={outputName} onChange={(e) => setOutputName(e.target.value)} />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Pipeline Selection */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">Pipeline</label>
                  <select className="select" value={pipelineId} onChange={(e) => setPipelineId(e.target.value)}>
                    <option value="">Select...</option>
                    {generationPipelines.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {selectedPipeline && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
                      <span className="font-medium">{selectedPipeline.pipelineData.steps.length} steps:</span>{' '}
                      {selectedPipeline.pipelineData.steps.map((s) => s.name).join(' → ')}
                    </div>
                  )}
                </div>

                {/* Output Folder (pipeline manages names per step) */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">Output Folder</label>
                  <select className="select" value={outputFolderId || ''} onChange={(e) => setOutputFolderId(e.target.value || null)}>
                    <option value="">Project root</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>{getFolderPath(f.id) || f.name}</option>
                    ))}
                  </select>
                </div>

                {/* Pipeline Progress */}
                {pipelineRun && (
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-2">Progress</label>
                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                      {(pipelineRun.stepResults as StepResult[]).map((step) => (
                        <div key={step.stepIndex} className="flex items-center gap-3 px-3 py-2.5">
                          {stepStatusIcon(step.status)}
                          <span className={`text-sm ${step.status === 'running' ? 'text-blue-700 font-medium' : step.status === 'completed' ? 'text-gray-700' : step.status === 'failed' ? 'text-red-700' : 'text-gray-400'}`}>
                            {step.stepName}
                          </span>
                          {step.error && (
                            <span className="text-xs text-red-500 ml-auto truncate max-w-[200px]" title={step.error}>{step.error}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

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
                  {mode === 'pipeline' ? 'Running Pipeline...' : 'Generating...'}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {mode === 'pipeline' ? 'Run Pipeline' : 'Generate'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
