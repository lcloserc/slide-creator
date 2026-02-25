import { useState } from 'react';
import type { Block } from '../types';

interface BlockToolbarProps {
  onAdd: (type: Block['type']) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function BlockToolbar({ onAdd, onDelete, onMoveUp, onMoveDown }: BlockToolbarProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const blockTypes: { type: Block['type']; label: string }[] = [
    { type: 'text', label: 'Text' },
    { type: 'bullets', label: 'Bullets' },
    { type: 'numbered', label: 'Numbered' },
    { type: 'table', label: 'Table' },
    { type: 'quote', label: 'Quote' },
  ];

  return (
    <div className="flex items-center gap-0.5 bg-white rounded-lg shadow-lg border border-gray-200 px-1 py-0.5">
      <div className="relative">
        <button
          className="btn-icon"
          onClick={() => setShowAddMenu(!showAddMenu)}
          title="Add block"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
        {showAddMenu && (
          <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[120px]">
            {blockTypes.map((bt) => (
              <button
                key={bt.type}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 text-gray-700"
                onClick={() => { onAdd(bt.type); setShowAddMenu(false); }}
              >
                {bt.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <button className="btn-icon" onClick={onMoveUp} title="Move up">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>
      <button className="btn-icon" onClick={onMoveDown} title="Move down">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <button className="btn-icon text-red-400 hover:text-red-600" onClick={onDelete} title="Delete block">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
