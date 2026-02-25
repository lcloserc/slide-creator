import React, { useState, useRef, useCallback } from 'react';
import { useStore } from '../store';
import { api } from '../lib/api';
import type { Folder, Resource, GenerationPrompt, SystemPrompt, OutputFormat, GenerationPipeline } from '../types';
import { isPresentation } from '../types';

export function TreePanel() {
  const {
    projects, currentProjectId, setCurrentProject, createProject, deleteProject,
    folders, resources, generationPrompts, systemPrompts, outputFormats, generationPipelines,
    editorTarget, setEditorTarget, createFolder, renameFolder, deleteFolder,
    deleteResource, uploadFile, uploadFiles,
    createGenerationPrompt, deleteGenerationPrompt,
    createSystemPrompt, deleteSystemPrompt,
    createOutputFormat, deleteOutputFormat,
    createGenerationPipeline, deleteGenerationPipeline,
  } = useStore();

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; target: any; targetType: string } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingType, setRenamingType] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renamingOriginalName, setRenamingOriginalName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['program', 'gen-prompts', 'sys-prompts', 'project', 'project-resources'])
  );
  const [uploadConfirmFiles, setUploadConfirmFiles] = useState<File[] | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleContextMenu = (e: React.MouseEvent, target: any, targetType: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, target, targetType });
  };

  const closeContextMenu = () => setContextMenu(null);

  const programResourceTypes = new Set(['generation_prompt', 'system_prompt', 'output_format', 'generation_pipeline']);

  const startRename = (id: string, currentName: string, targetType: string) => {
    setRenamingId(id);
    setRenamingType(targetType);
    setRenameValue(currentName);
    setRenamingOriginalName(currentName);
    closeContextMenu();
  };

  const handleRenameSubmit = async () => {
    if (!renamingId || !renameValue.trim() || !renamingType) { setRenamingId(null); return; }
    const name = renameValue.trim();

    const isProgramResource = programResourceTypes.has(renamingType);
    if (isProgramResource && name !== renamingOriginalName) {
      if (!confirm('Renaming a program resource may break pipelines or prompts that reference it by name. Continue?')) {
        setRenamingId(null);
        setRenamingType(null);
        return;
      }
    }

    try {
      if (renamingType === 'folder') {
        await renameFolder(renamingId, name);
      } else if (renamingType === 'resource') {
        await useStore.getState().updateResource(renamingId, { name } as any);
      } else if (renamingType === 'generation_prompt') {
        await useStore.getState().updateGenerationPrompt(renamingId, { name });
      } else if (renamingType === 'system_prompt') {
        await useStore.getState().updateSystemPrompt(renamingId, { name });
      } else if (renamingType === 'output_format') {
        await useStore.getState().updateOutputFormat(renamingId, { name });
      } else if (renamingType === 'generation_pipeline') {
        await useStore.getState().updateGenerationPipeline(renamingId, { name });
      }
    } catch (err: any) {
      alert(err.message || 'Rename failed');
    }
    setRenamingId(null);
    setRenamingType(null);
  };

  const handleDelete = async () => {
    if (!contextMenu) return;
    const { target, targetType } = contextMenu;
    if (targetType === 'folder') await deleteFolder(target.id);
    else if (targetType === 'resource') await deleteResource(target.id);
    else if (targetType === 'generation_prompt') await deleteGenerationPrompt(target.id);
    else if (targetType === 'system_prompt') await deleteSystemPrompt(target.id);
    else if (targetType === 'output_format') await deleteOutputFormat(target.id);
    else if (targetType === 'generation_pipeline') await deleteGenerationPipeline(target.id);
    closeContextMenu();
  };

  const handleDuplicate = async () => {
    if (!contextMenu) return;
    const { target, targetType } = contextMenu;

    if (targetType === 'resource' && currentProjectId) {
      const source = await api.resources.get(target.id);
      await api.resources.create(currentProjectId, {
        name: `Copy of ${source.name}`,
        resourceType: source.resourceType,
        contentText: source.contentText,
        contentJson: source.contentJson,
        folderId: source.folderId,
      });
      await useStore.getState().loadProjectData(currentProjectId);
    } else if (targetType === 'generation_prompt') {
      const source = await api.generationPrompts.get(target.id);
      await createGenerationPrompt({ name: `Copy of ${source.name}`, content: source.content });
    } else if (targetType === 'system_prompt') {
      const source = await api.systemPrompts.get(target.id);
      await createSystemPrompt({ name: `Copy of ${source.name}`, content: source.content });
    } else if (targetType === 'output_format') {
      const source = await api.outputFormats.get(target.id);
      await createOutputFormat({ name: `Copy of ${source.name}`, content: source.content });
    } else if (targetType === 'generation_pipeline') {
      const source = await api.generationPipelines.get(target.id);
      await createGenerationPipeline({ name: `Copy of ${source.name}`, pipelineData: source.pipelineData });
    }

    closeContextMenu();
  };

  const isDescendant = useCallback((folderId: string, potentialAncestorId: string): boolean => {
    let current = folders.find((f) => f.id === folderId);
    while (current) {
      if (current.parentId === potentialAncestorId) return true;
      current = folders.find((f) => f.id === current!.parentId);
    }
    return false;
  }, [folders]);

  const handleDragStart = (e: React.DragEvent, type: 'folder' | 'resource', id: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type, id }));
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
  };

  const handleDragEnd = () => setDragOverFolderId(null);

  const handleDragOver = (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolderId(targetFolderId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setDragOverFolderId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;
    const { type, id } = JSON.parse(raw) as { type: 'folder' | 'resource'; id: string };

    if (type === 'resource') {
      await useStore.getState().updateResource(id, { folderId: targetFolderId } as any);
    } else if (type === 'folder') {
      if (id === targetFolderId) return;
      if (targetFolderId && isDescendant(targetFolderId, id)) return;
      await api.folders.update(id, { parentId: targetFolderId });
      const pid = currentProjectId;
      if (pid) await useStore.getState().loadProjectData(pid);
    }
  };

  const renderFolderContents = (parentId: string | null) => {
    const childFolders = folders.filter((f) => f.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder);
    const childResources = resources.filter((r) => r.folderId === parentId);

    return (
      <>
        {childFolders.map((folder) => (
          <div key={folder.id} className="ml-3">
            <div
              className={`tree-item ${dragOverFolderId === folder.id ? 'bg-blue-50 ring-1 ring-blue-300 rounded' : ''}`}
              onClick={() => toggleFolder(folder.id)}
              onContextMenu={(e) => handleContextMenu(e, folder, 'folder')}
              draggable
              onDragStart={(e) => handleDragStart(e, 'folder', folder.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, folder.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, folder.id)}
            >
              <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedFolders.has(folder.id) ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              {renamingId === folder.id ? (
                <input
                  className="input text-xs py-0 px-1"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={handleRenameSubmit}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setRenamingId(null); }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="truncate text-gray-700">{folder.name}</span>
              )}
            </div>
            {expandedFolders.has(folder.id) && renderFolderContents(folder.id)}
          </div>
        ))}
        {childResources.map((resource) => (
          <div
            key={resource.id}
            className={`tree-item ml-3 ${editorTarget.type === 'resource' && editorTarget.resource.id === resource.id ? 'active' : ''}`}
            onClick={() => setEditorTarget({ type: 'resource', resource })}
            onContextMenu={(e) => handleContextMenu(e, resource, 'resource')}
            draggable
            onDragStart={(e) => handleDragStart(e, 'resource', resource.id)}
            onDragEnd={handleDragEnd}
          >
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              {isPresentation(resource) ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              )}
            </svg>
            {renamingId === resource.id ? (
              <input
                className="input text-xs py-0 px-1"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setRenamingId(null); }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="truncate">{resource.name}</span>
            )}
          </div>
        ))}
      </>
    );
  };

  const renderProgramItem = <T extends { id: string; name: string }>(
    item: T,
    type: string,
    setTarget: () => void,
    isActive: boolean,
  ) => (
    <div
      key={item.id}
      className={`tree-item ml-6 ${isActive ? 'active' : ''}`}
      onClick={setTarget}
      onContextMenu={(e) => handleContextMenu(e, item, type)}
    >
      <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
      {renamingId === item.id ? (
        <input
          className="input text-xs py-0 px-1"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setRenamingId(null); }}
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="truncate">{item.name}</span>
      )}
    </div>
  );

  const renderGroupedProgramItems = <T extends { id: string; name: string; folder?: string | null }>(
    items: T[],
    type: string,
    sectionPrefix: string,
    getSetTarget: (item: T) => () => void,
    getIsActive: (item: T) => boolean,
  ) => {
    const ungrouped = items.filter((item) => !item.folder);
    const folderNames = [...new Set(items.map((item) => item.folder).filter(Boolean))] as string[];

    return (
      <>
        {ungrouped.map((item) => renderProgramItem(item, type, getSetTarget(item), getIsActive(item)))}
        {folderNames.map((folderName) => {
          const folderKey = `${sectionPrefix}-folder-${folderName}`;
          const folderItems = items.filter((item) => item.folder === folderName);
          return (
            <div key={folderKey} className="ml-3">
              <div className="tree-item" onClick={() => toggleSection(folderKey)}>
                <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedSections.has(folderKey) ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <span className="truncate text-gray-600 text-sm">{folderName}</span>
              </div>
              {expandedSections.has(folderKey) && folderItems.map((item) =>
                renderProgramItem(item, type, getSetTarget(item), getIsActive(item))
              )}
            </div>
          );
        })}
      </>
    );
  };

  const SectionHeader = ({ id, label, onAdd, rightActions }: { id: string; label: string; onAdd?: () => void; rightActions?: React.ReactNode }) => (
    <div className="flex items-center justify-between group">
      <div className="tree-item flex-1" onClick={() => toggleSection(id)}>
        <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedSections.has(id) ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="font-medium text-gray-700 text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
        {rightActions}
        {onAdd && (
          <button className="btn-icon" onClick={onAdd} title="Add new">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-72 border-r border-gray-200 bg-white flex flex-col shrink-0 overflow-hidden" onClick={() => { closeContextMenu(); }}>
      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
        {/* Program Resources */}
        <div>
          <SectionHeader id="program" label="Program Resources" />
          {expandedSections.has('program') && (
            <div className="ml-3 space-y-0.5">
              <SectionHeader id="gen-prompts" label="Generation Prompts" onAdd={() => createGenerationPrompt({ name: 'New Prompt', content: '' })} />
              {expandedSections.has('gen-prompts') && renderGroupedProgramItems(
                generationPrompts, 'generation_prompt', 'gen-prompts',
                (p) => () => setEditorTarget({ type: 'generation_prompt', item: p }),
                (p) => editorTarget.type === 'generation_prompt' && editorTarget.item.id === p.id,
              )}

              <SectionHeader id="sys-prompts" label="System Prompts" onAdd={() => createSystemPrompt({ name: 'New System Prompt', content: '' })} />
              {expandedSections.has('sys-prompts') && renderGroupedProgramItems(
                systemPrompts, 'system_prompt', 'sys-prompts',
                (p) => () => setEditorTarget({ type: 'system_prompt', item: p }),
                (p) => editorTarget.type === 'system_prompt' && editorTarget.item.id === p.id,
              )}

              <SectionHeader id="output-formats" label="Output Formats" onAdd={() => createOutputFormat({
                name: 'New Format',
                content: '',
              })} />
              {expandedSections.has('output-formats') && outputFormats.map((f) =>
                renderProgramItem(f, 'output_format', () => setEditorTarget({ type: 'output_format', item: f }), editorTarget.type === 'output_format' && editorTarget.item.id === f.id)
              )}

              <SectionHeader id="pipelines" label="Generation Pipelines" onAdd={() => createGenerationPipeline({
                name: 'New Pipeline',
                pipelineData: { steps: [] } as any,
              })} />
              {expandedSections.has('pipelines') && generationPipelines.map((p) =>
                renderProgramItem(p, 'generation_pipeline', () => setEditorTarget({ type: 'generation_pipeline', item: p }), editorTarget.type === 'generation_pipeline' && editorTarget.item.id === p.id)
              )}
            </div>
          )}
        </div>

        <div className="h-px bg-gray-200 my-2" />

        {/* Project Selector */}
        <div className="px-2 pb-1">
          <div className="flex items-center gap-1">
            <select
              className="select text-sm flex-1"
              value={currentProjectId || ''}
              onChange={(e) => setCurrentProject(e.target.value || null)}
            >
              <option value="">Select a project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button
              className="btn-icon"
              onClick={async () => {
                const id = Date.now().toString(36).slice(-5);
                const p = await createProject(`Project ${id}`);
                setCurrentProject(p.id);
              }}
              title="New project"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
            {currentProjectId && (
              <button
                className="btn-icon text-red-400 hover:text-red-600"
                onClick={() => { if (confirm('Delete this project and all its contents?')) deleteProject(currentProjectId); }}
                title="Delete project"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Project Tree */}
        {currentProjectId && (
          <div>
            <SectionHeader id="project-resources" label={`${projects.find((p) => p.id === currentProjectId)?.name ?? 'Project'} - Resources`} rightActions={
              <>
                <button
                  className="btn-icon"
                  onClick={() => createFolder('New Folder')}
                  title="New folder"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                </button>
                <button
                  className="btn-icon"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload file"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length === 0) return;
                    if (files.length === 1) {
                      await uploadFile(files[0]);
                    } else {
                      setUploadConfirmFiles(files);
                    }
                    e.target.value = '';
                  }}
                />
              </>
            } />
            {expandedSections.has('project-resources') && (
              <div
                className={`ml-3 min-h-[24px] ${dragOverFolderId === '__root__' ? 'bg-blue-50 ring-1 ring-blue-300 rounded' : ''}`}
                onDragOver={(e) => handleDragOver(e, '__root__')}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, null)}
              >
                {renderFolderContents(null)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeContextMenu} />
          <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
            <div className="context-menu-item" onClick={() => startRename(contextMenu.target.id, contextMenu.target.name, contextMenu.targetType)}>
              Rename
            </div>
            {contextMenu.targetType !== 'folder' && (
              <div className="context-menu-item" onClick={handleDuplicate}>
                Duplicate
              </div>
            )}
            <div className="context-menu-item danger" onClick={handleDelete}>
              Delete
            </div>
          </div>
        </>
      )}

      {/* Upload Confirmation Modal */}
      {uploadConfirmFiles && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setUploadConfirmFiles(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full pointer-events-auto">
              <p className="text-sm text-gray-700 mb-4">
                Really upload {uploadConfirmFiles.length} files?
              </p>
              <div className="flex justify-end gap-2">
                <button className="btn-secondary text-sm" onClick={() => setUploadConfirmFiles(null)}>
                  Cancel
                </button>
                <button
                  className="btn-primary text-sm"
                  onClick={async () => {
                    const files = uploadConfirmFiles;
                    setUploadConfirmFiles(null);
                    await uploadFiles(files);
                  }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
