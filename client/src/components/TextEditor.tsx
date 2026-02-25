import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';

interface TextEditorProps {
  resourceId: string;
  content: string;
  onSave?: (content: string) => void;
  label?: string;
}

export function TextEditor({ resourceId, content, onSave, label }: TextEditorProps) {
  const updateResource = useStore((s) => s.updateResource);
  const [value, setValue] = useState(content);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setValue(content);
  }, [resourceId, content]);

  const debouncedSave = useCallback(
    (text: string) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        if (onSave) {
          onSave(text);
        } else {
          updateResource(resourceId, { contentText: text } as any);
        }
      }, 1000);
    },
    [resourceId, onSave, updateResource]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    debouncedSave(newValue);
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      {label && (
        <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
          <span className="text-sm font-medium text-gray-600">{label}</span>
        </div>
      )}
      <textarea
        className="flex-1 w-full p-4 font-mono text-sm resize-none focus:outline-none bg-white text-gray-800 leading-relaxed"
        value={value}
        onChange={handleChange}
        placeholder="Start typing..."
        spellCheck={false}
      />
    </div>
  );
}
