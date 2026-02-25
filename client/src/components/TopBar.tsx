import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { isPresentation } from '../types';
import { exportToPptx } from '../lib/pptxExport';

interface TopBarProps {
  onOpenManual: () => void;
}

export function TopBar({ onOpenManual }: TopBarProps) {
  const currentProjectId = useStore((s) => s.currentProjectId);
  const projects = useStore((s) => s.projects);
  const editorTarget = useStore((s) => s.editorTarget);
  const renameProject = useStore((s) => s.renameProject);
  const setGenerateDialogOpen = useStore((s) => s.setGenerateDialogOpen);
  const setPresentationMode = useStore((s) => s.setPresentationMode);

  const currentProject = projects.find((p) => p.id === currentProjectId);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const showPresentation =
    editorTarget.type === 'resource' &&
    isPresentation(editorTarget.resource) &&
    editorTarget.resource.contentJson;

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const handleSaveProjectName = () => {
    if (currentProject && editName.trim()) {
      renameProject(currentProject.id, editName.trim());
    }
    setEditing(false);
  };

  const handleExport = () => {
    if (editorTarget.type === 'resource' && editorTarget.resource.contentJson) {
      exportToPptx(editorTarget.resource.contentJson, editorTarget.resource.name);
    }
  };

  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center px-4 gap-4 shrink-0">
      <img src="/logo.png" alt="SlideCreator" className="h-8" />

      <div className="h-6 w-px bg-gray-200" />

      {currentProject && (
        <div className="flex items-center">
          {editing ? (
            <input
              ref={inputRef}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSaveProjectName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveProjectName();
                if (e.key === 'Escape') setEditing(false);
              }}
              className="input max-w-[200px]"
            />
          ) : (
            <button
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-2 py-1 rounded hover:bg-gray-50"
              onClick={() => {
                setEditName(currentProject.name);
                setEditing(true);
              }}
            >
              {currentProject.name}
            </button>
          )}
        </div>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {currentProjectId && (
          <button className="btn-primary" onClick={() => setGenerateDialogOpen(true)}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate
          </button>
        )}

        {showPresentation && (
          <>
            <button className="btn-secondary" onClick={handleExport}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export PPTX
            </button>
            <button className="btn-secondary" onClick={() => setPresentationMode(true)}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Present
            </button>
          </>
        )}

        <div className="h-6 w-px bg-gray-200" />

        <div className="relative" ref={menuRef}>
          <button
            className="btn-icon"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px] z-50">
              <button
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                onClick={() => { setMenuOpen(false); onOpenManual(); }}
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Manual
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
