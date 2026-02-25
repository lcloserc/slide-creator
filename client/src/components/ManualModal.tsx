import { useRef } from 'react';

interface ManualModalProps {
  open: boolean;
  onClose: () => void;
}

export function ManualModal({ open, onClose }: ManualModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  const handleDownloadPdf = async () => {
    const el = contentRef.current;
    if (!el) return;
    const html2pdf = (await import('html2pdf.js')).default;
    html2pdf()
      .set({
        margin: [12, 14, 12, 14],
        filename: 'SlideCreator-Manual.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(el)
      .save();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">Manual</h2>
            <div className="flex items-center gap-2">
              <button className="btn-secondary text-xs !px-3 !py-1.5" onClick={handleDownloadPdf}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </button>
              <button className="btn-icon" onClick={onClose}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="overflow-y-auto p-6 scrollbar-thin">
            <div ref={contentRef} className="manual-content text-sm text-gray-700 leading-relaxed">
              <h1 className="text-xl font-bold text-gray-900 mb-1">SlideCreator — Quick Reference</h1>
              <p className="text-xs text-gray-400 mb-5">A tool for creating, generating, and exporting presentation slide decks with AI.</p>

              <Section title="Interface Overview">
                <Entry term="Top Bar">
                  Project name (click to rename), <strong>Generate</strong> button, <strong>Export PPTX</strong>, and <strong>Present</strong> (visible when a presentation is open). The <strong>☰ menu</strong> (right) provides access to this manual.
                </Entry>
                <Entry term="Tree Panel (left)">
                  Two collapsible sections: <em>Program Resources</em> (shared across projects) and <em>[Project Name] - Resources</em> (scoped to the selected project). Right-click items to rename, duplicate, or delete. Drag and drop files and folders to reorganize. Upload multiple files at once — uploaded files are automatically placed in an "Imported" folder. The entire sidebar can be collapsed via the toggle strip at its edge.
                </Entry>
                <Entry term="Editor (center)">
                  Opens the selected resource. Source files and prompts open a text editor. Presentations open the visual slide editor. All edits auto-save.
                </Entry>
                <Entry term="Slide Editor">
                  Thumbnail sidebar (left) for navigation and ordering. Slide canvas (center) with contenteditable blocks. Toolbar above for theme selection and notes toggle.
                </Entry>
              </Section>

              <Section title="Resources">
                <Entry term="Projects">
                  Top-level containers. Each project holds its own folders, source files, and presentations. Switch projects via the dropdown in the tree panel.
                </Entry>
                <Entry term="Folders">
                  Organize resources inside a project. Create via the folder icon in the Project Resources header. Drag and drop files or folders to move them between folders.
                </Entry>
                <Entry term="Source Files">
                  Text files uploaded into a project (e.g. notes, reports, outlines). Used as input for AI generation.
                </Entry>
                <Entry term="Presentations">
                  Slide decks stored as structured JSON. Created by AI generation or manually. Editable in the slide editor. Exportable to PPTX.
                </Entry>
              </Section>

              <Section title="Program Resources (shared)">
                <p className="text-sm mb-2">All program resource names must be <strong>unique across all types</strong>. Names are used as identifiers in pipeline definitions and output format variables. Renaming a resource may break references.</p>
                <Entry term="Generation Prompts">
                  Instructions telling the AI <em>how</em> to create a presentation. Can be organized into folders (e.g. "Pipeline"). Referenced by name in pipeline steps.
                </Entry>
                <Entry term="System Prompts">
                  High-level role instructions sent to the AI as the system message. Can be organized into folders. Referenced by name in pipeline steps.
                </Entry>
                <Entry term="Output Formats">
                  Schema definitions that describe the expected JSON output structure. Referenced in prompts using <code>{'{{name}}'}</code> syntax (e.g. <code>{'{{Presentation schema}}'}</code>). The backend replaces these variables before sending to the AI.
                </Entry>
                <Entry term="Generation Pipelines">
                  Multi-step generation workflows defined as JSON. Each step references prompts <strong>by name</strong>, specifies sources, and controls whether to save the output. Steps can reference outputs from previous steps.
                </Entry>
              </Section>

              <Section title="Generation Flow">
                <p className="text-sm mb-2">The Generate dialog offers two modes: <strong>Single Generation</strong> and <strong>Pipeline</strong>.</p>
                <Entry term="Single Generation">
                  Select source files, a generation prompt, and a system prompt. The AI produces a single presentation.
                </Entry>
                <Entry term="Pipeline">
                  Select source files and a pipeline. The pipeline executes multiple steps sequentially (e.g. generate, critique, improve). Progress is shown step-by-step. The final result opens in the editor.
                </Entry>
              </Section>

              <Section title="Key Features">
                <Entry term="Slide Editing">
                  Click any text on a slide to edit it inline. Use the floating toolbar to add, delete, or reorder blocks (text, bullets, numbered lists, tables, quotes).
                </Entry>
                <Entry term="Themes">
                  Four built-in presets: Dark, Light, Warm, Midnight. Switch via the dropdown in the slide editor toolbar.
                </Entry>
                <Entry term="Export PPTX">
                  Downloads a native PowerPoint file with editable text and tables. Click <strong>Export PPTX</strong> in the top bar.
                </Entry>
                <Entry term="Presentation Mode">
                  Fullscreen slideshow. Arrow keys or click to navigate. Press <strong>N</strong> for speaker notes, <strong>Esc</strong> to exit.
                </Entry>
              </Section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide border-b border-gray-200 pb-1 mb-2">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Entry({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="font-medium text-gray-800">{term} — </span>
      <span>{children}</span>
    </div>
  );
}
