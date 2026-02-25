import { useRef, useState, useCallback } from 'react';
import type { Slide, Block, Theme } from '../types';
import { BlockToolbar } from './BlockToolbar';

interface SlideCanvasProps {
  slide: Slide;
  theme: Theme;
  onUpdateSlide: (updater: (slide: Slide) => Slide) => void;
  readOnly?: boolean;
}

export function SlideCanvas({ slide, theme, onUpdateSlide, readOnly = false }: SlideCanvasProps) {
  const [focusedBlockIndex, setFocusedBlockIndex] = useState<number | null>(null);
  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleBlockFocus = (index: number, element: HTMLElement) => {
    setFocusedBlockIndex(index);
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    const blockRect = element.getBoundingClientRect();
    if (canvasRect) {
      setToolbarPos({
        top: blockRect.top - canvasRect.top - 40,
        left: blockRect.left - canvasRect.left,
      });
    }
  };

  const handleBlockBlur = () => {
    setTimeout(() => {
      setFocusedBlockIndex(null);
      setToolbarPos(null);
    }, 200);
  };

  const updateBlock = useCallback(
    (blockIndex: number, updater: (block: Block) => Block) => {
      onUpdateSlide((s) => ({
        ...s,
        blocks: s.blocks.map((b, i) => (i === blockIndex ? updater(b) : b)),
      }));
    },
    [onUpdateSlide]
  );

  const addBlock = (type: Block['type'], afterIndex: number) => {
    let newBlock: Block;
    switch (type) {
      case 'text': newBlock = { type: 'text', content: '' }; break;
      case 'bullets': newBlock = { type: 'bullets', items: [''] }; break;
      case 'numbered': newBlock = { type: 'numbered', items: [''] }; break;
      case 'table': newBlock = { type: 'table', headers: ['Header 1', 'Header 2'], rows: [['', '']] }; break;
      case 'quote': newBlock = { type: 'quote', content: '' }; break;
    }
    onUpdateSlide((s) => ({
      ...s,
      blocks: [...s.blocks.slice(0, afterIndex + 1), newBlock, ...s.blocks.slice(afterIndex + 1)],
    }));
  };

  const deleteBlock = (index: number) => {
    if (slide.blocks.length <= 1) return;
    onUpdateSlide((s) => ({
      ...s,
      blocks: s.blocks.filter((_, i) => i !== index),
    }));
    setFocusedBlockIndex(null);
  };

  const moveBlock = (from: number, to: number) => {
    if (to < 0 || to >= slide.blocks.length) return;
    onUpdateSlide((s) => {
      const blocks = [...s.blocks];
      const [moved] = blocks.splice(from, 1);
      blocks.splice(to, 0, moved);
      return { ...s, blocks };
    });
    setFocusedBlockIndex(to);
  };

  const handleContentEditable = (
    e: React.FormEvent<HTMLElement>,
    blockIndex: number,
    field: string,
    itemIndex?: number,
    cellCol?: number
  ) => {
    const text = (e.target as HTMLElement).innerText;
    updateBlock(blockIndex, (block) => {
      if (field === 'content' && (block.type === 'text' || block.type === 'quote')) {
        return { ...block, content: text };
      }
      if (field === 'item' && itemIndex !== undefined && (block.type === 'bullets' || block.type === 'numbered')) {
        const items = [...block.items];
        items[itemIndex] = text;
        return { ...block, items };
      }
      if (field === 'header' && itemIndex !== undefined && block.type === 'table') {
        const headers = [...block.headers];
        headers[itemIndex] = text;
        return { ...block, headers };
      }
      if (field === 'cell' && itemIndex !== undefined && cellCol !== undefined && block.type === 'table') {
        const rows = block.rows.map((r) => [...r]);
        if (rows[itemIndex]) rows[itemIndex][cellCol] = text;
        return { ...block, rows };
      }
      return block;
    });
  };

  const handleListKeyDown = (
    e: React.KeyboardEvent,
    blockIndex: number,
    itemIndex: number,
    block: Block & { type: 'bullets' | 'numbered' }
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onUpdateSlide((s) => ({
        ...s,
        blocks: s.blocks.map((b, i) => {
          if (i !== blockIndex || (b.type !== 'bullets' && b.type !== 'numbered')) return b;
          const items = [...b.items];
          items.splice(itemIndex + 1, 0, '');
          return { ...b, items };
        }),
      }));
    }
    if (e.key === 'Backspace' && (e.target as HTMLElement).innerText === '' && block.items.length > 1) {
      e.preventDefault();
      onUpdateSlide((s) => ({
        ...s,
        blocks: s.blocks.map((b, i) => {
          if (i !== blockIndex || (b.type !== 'bullets' && b.type !== 'numbered')) return b;
          return { ...b, items: b.items.filter((_, idx) => idx !== itemIndex) };
        }),
      }));
    }
  };

  const handleTableKeyDown = (e: React.KeyboardEvent, blockIndex: number) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const nextCell = (e.target as HTMLElement).closest('td, th')
        ?.nextElementSibling as HTMLElement | null;
      if (nextCell) {
        const editable = nextCell.querySelector('[contenteditable]') as HTMLElement;
        editable?.focus();
      }
    }
  };

  const addTableRow = (blockIndex: number) => {
    updateBlock(blockIndex, (block) => {
      if (block.type !== 'table') return block;
      return { ...block, rows: [...block.rows, new Array(block.headers.length).fill('')] };
    });
  };

  const addTableColumn = (blockIndex: number) => {
    updateBlock(blockIndex, (block) => {
      if (block.type !== 'table') return block;
      return {
        ...block,
        headers: [...block.headers, `Header ${block.headers.length + 1}`],
        rows: block.rows.map((r) => [...r, '']),
      };
    });
  };

  const removeTableRow = (blockIndex: number) => {
    updateBlock(blockIndex, (block) => {
      if (block.type !== 'table' || block.rows.length <= 1) return block;
      return { ...block, rows: block.rows.slice(0, -1) };
    });
  };

  const removeTableColumn = (blockIndex: number) => {
    updateBlock(blockIndex, (block) => {
      if (block.type !== 'table' || block.headers.length <= 1) return block;
      return {
        ...block,
        headers: block.headers.slice(0, -1),
        rows: block.rows.map((r) => r.slice(0, -1)),
      };
    });
  };

  const renderBlock = (block: Block, index: number) => {
    const commonProps = {
      onFocus: (e: React.FocusEvent<HTMLElement>) => handleBlockFocus(index, e.currentTarget),
      onBlur: handleBlockBlur,
    };

    switch (block.type) {
      case 'text':
        return (
          <div
            key={index}
            contentEditable={!readOnly}
            suppressContentEditableWarning
            data-placeholder="Type text here..."
            className="outline-none leading-relaxed py-1 px-2 rounded"
            style={{ color: theme.textColor, fontSize: '16px' }}
            onInput={(e) => handleContentEditable(e, index, 'content')}
            dangerouslySetInnerHTML={{ __html: block.content }}
            {...commonProps}
          />
        );

      case 'bullets':
      case 'numbered':
        const ListTag = block.type === 'bullets' ? 'ul' : 'ol';
        return (
          <ListTag
            key={index}
            className={`py-1 px-2 space-y-1 ${block.type === 'bullets' ? 'list-disc' : 'list-decimal'} ml-6`}
            style={{ color: theme.textColor }}
          >
            {block.items.map((item, itemIdx) => (
              <li key={itemIdx}>
                <div
                  contentEditable={!readOnly}
                  suppressContentEditableWarning
                  data-placeholder="List item..."
                  className="outline-none"
                  style={{ fontSize: '15px' }}
                  onInput={(e) => handleContentEditable(e, index, 'item', itemIdx)}
                  onKeyDown={(e) => handleListKeyDown(e, index, itemIdx, block)}
                  dangerouslySetInnerHTML={{ __html: item }}
                  {...commonProps}
                />
              </li>
            ))}
          </ListTag>
        );

      case 'table':
        return (
          <div key={index} className="py-1 px-2" {...commonProps}>
            <table className="w-full border-collapse rounded overflow-hidden" style={{ fontSize: '14px' }}>
              <thead>
                <tr>
                  {block.headers.map((header, hi) => (
                    <th
                      key={hi}
                      className="border border-gray-300 px-3 py-2 text-left font-semibold"
                      style={{ backgroundColor: theme.accentColor, color: '#fff' }}
                    >
                      <div
                        contentEditable={!readOnly}
                        suppressContentEditableWarning
                        className="outline-none"
                        onInput={(e) => handleContentEditable(e, index, 'header', hi)}
                        onKeyDown={(e) => handleTableKeyDown(e, index)}
                        dangerouslySetInnerHTML={{ __html: header }}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="border border-gray-200 px-3 py-2" style={{ color: theme.textColor }}>
                        <div
                          contentEditable={!readOnly}
                          suppressContentEditableWarning
                          className="outline-none"
                          data-placeholder="..."
                          onInput={(e) => handleContentEditable(e, index, 'cell', ri, ci)}
                          onKeyDown={(e) => handleTableKeyDown(e, index)}
                          dangerouslySetInnerHTML={{ __html: cell }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {!readOnly && focusedBlockIndex === index && (
              <div className="flex gap-1 mt-1">
                <button className="text-xs text-blue-600 hover:underline" onClick={() => addTableRow(index)}>+ Row</button>
                <button className="text-xs text-blue-600 hover:underline" onClick={() => addTableColumn(index)}>+ Column</button>
                <button className="text-xs text-red-500 hover:underline" onClick={() => removeTableRow(index)}>- Row</button>
                <button className="text-xs text-red-500 hover:underline" onClick={() => removeTableColumn(index)}>- Column</button>
              </div>
            )}
          </div>
        );

      case 'quote':
        return (
          <div
            key={index}
            className="py-2 px-4 my-1 italic rounded"
            style={{
              borderLeft: `4px solid ${theme.accentColor}`,
              backgroundColor: theme.backgroundColor === '#FFFFFF' || theme.backgroundColor === '#FFF8F0'
                ? '#f8f9fa' : 'rgba(255,255,255,0.05)',
              color: theme.textColor,
            }}
          >
            <div
              contentEditable={!readOnly}
              suppressContentEditableWarning
              data-placeholder="Enter quote..."
              className="outline-none"
              style={{ fontSize: '16px' }}
              onInput={(e) => handleContentEditable(e, index, 'content')}
              dangerouslySetInnerHTML={{ __html: block.content }}
              {...commonProps}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      ref={canvasRef}
      className="slide-canvas rounded-xl shadow-lg overflow-hidden relative"
      style={{ backgroundColor: theme.backgroundColor }}
    >
      <div className="p-8 h-full flex flex-col">
        {/* Title */}
        <div
          contentEditable={!readOnly}
          suppressContentEditableWarning
          data-placeholder="Slide Title"
          className="text-3xl font-bold outline-none mb-4 leading-tight"
          style={{ color: theme.titleColor }}
          onInput={(e) => {
            const text = (e.target as HTMLElement).innerText;
            onUpdateSlide((s) => ({ ...s, title: text }));
          }}
          dangerouslySetInnerHTML={{ __html: slide.title }}
        />

        {/* Blocks */}
        <div className="flex-1 space-y-3 overflow-y-auto">
          {slide.blocks.map((block, i) => renderBlock(block, i))}
        </div>
      </div>

      {/* Floating toolbar */}
      {!readOnly && focusedBlockIndex !== null && toolbarPos && (
        <div
          className="absolute z-10"
          style={{ top: Math.max(0, toolbarPos.top), left: toolbarPos.left }}
        >
          <BlockToolbar
            onAdd={(type) => addBlock(type, focusedBlockIndex)}
            onDelete={() => deleteBlock(focusedBlockIndex)}
            onMoveUp={() => moveBlock(focusedBlockIndex, focusedBlockIndex - 1)}
            onMoveDown={() => moveBlock(focusedBlockIndex, focusedBlockIndex + 1)}
          />
        </div>
      )}
    </div>
  );
}
