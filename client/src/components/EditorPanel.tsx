import { useStore } from '../store';
import { isPresentation } from '../types';
import { TextEditor } from './TextEditor';
import { SlideEditor } from './SlideEditor';

export function EditorPanel() {
  const editorTarget = useStore((s) => s.editorTarget);

  if (editorTarget.type === 'none') {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-lg font-medium">No file selected</p>
          <p className="text-sm mt-1">Select a file from the tree to start editing</p>
        </div>
      </div>
    );
  }

  if (editorTarget.type === 'resource') {
    const { resource } = editorTarget;
    if (isPresentation(resource) && resource.contentJson) {
      return <SlideEditor resourceId={resource.id} data={resource.contentJson} />;
    }
    return <TextEditor resourceId={resource.id} content={resource.contentText || ''} />;
  }

  if (editorTarget.type === 'generation_prompt') {
    return (
      <TextEditor
        resourceId={editorTarget.item.id}
        content={editorTarget.item.content}
        onSave={(content) => useStore.getState().updateGenerationPrompt(editorTarget.item.id, { content })}
        label={editorTarget.item.name}
      />
    );
  }

  if (editorTarget.type === 'system_prompt') {
    return (
      <TextEditor
        resourceId={editorTarget.item.id}
        content={editorTarget.item.content}
        onSave={(content) => useStore.getState().updateSystemPrompt(editorTarget.item.id, { content })}
        label={editorTarget.item.name}
      />
    );
  }

  if (editorTarget.type === 'output_format') {
    return (
      <TextEditor
        resourceId={editorTarget.item.id}
        content={editorTarget.item.content}
        onSave={(content) => useStore.getState().updateOutputFormat(editorTarget.item.id, { content })}
        label={editorTarget.item.name}
      />
    );
  }

  if (editorTarget.type === 'generation_pipeline') {
    return (
      <TextEditor
        resourceId={editorTarget.item.id}
        content={JSON.stringify(editorTarget.item.pipelineData, null, 2)}
        onSave={(content) => {
          try {
            const pipelineData = JSON.parse(content);
            useStore.getState().updateGenerationPipeline(editorTarget.item.id, { pipelineData });
          } catch {
            // invalid JSON — don't save
          }
        }}
        label={editorTarget.item.name}
      />
    );
  }

  return null;
}
