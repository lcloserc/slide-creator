import { useEffect, useState } from 'react';
import { useStore } from './store';
import { TopBar } from './components/TopBar';
import { TreePanel } from './components/TreePanel';
import { EditorPanel } from './components/EditorPanel';
import { GenerateDialog } from './components/GenerateDialog';
import { PresentationMode } from './components/PresentationMode';
import { ManualModal } from './components/ManualModal';

export default function App() {
  const loadProjects = useStore((s) => s.loadProjects);
  const loadProgramResources = useStore((s) => s.loadProgramResources);
  const presentationMode = useStore((s) => s.presentationMode);
  const [manualOpen, setManualOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    loadProjects();
    loadProgramResources();
  }, []);

  if (presentationMode) {
    return <PresentationMode />;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar onOpenManual={() => setManualOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        {!sidebarCollapsed && <TreePanel />}
        <button
          className="shrink-0 w-5 flex items-center justify-center border-r border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          onClick={() => setSidebarCollapsed((v) => !v)}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={sidebarCollapsed ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'} />
          </svg>
        </button>
        <EditorPanel />
      </div>
      <GenerateDialog />
      <ManualModal open={manualOpen} onClose={() => setManualOpen(false)} />
    </div>
  );
}
