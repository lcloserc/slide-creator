import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';
import type { PresentationData, Slide, Block, Theme } from '../types';
import { THEME_PRESETS } from '../types';
import { SlideCanvas } from './SlideCanvas';
import { api } from '../lib/api';

interface SlideEditorProps {
  resourceId: string;
  data: PresentationData;
}

export function SlideEditor({ resourceId, data }: SlideEditorProps) {
  const updatePresentationData = useStore((s) => s.updatePresentationData);
  const [presentation, setPresentation] = useState<PresentationData>(data);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const idRef = useRef(resourceId);

  useEffect(() => {
    if (resourceId !== idRef.current) {
      idRef.current = resourceId;
      setPresentation(data);
      setSelectedSlideIndex(0);
    }
  }, [resourceId, data]);

  const persist = useCallback(
    (updated: PresentationData) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        api.resources.update(resourceId, { contentJson: updated });
        updatePresentationData(resourceId, updated);
      }, 1000);
    },
    [resourceId, updatePresentationData]
  );

  const update = useCallback(
    (updater: (prev: PresentationData) => PresentationData) => {
      setPresentation((prev) => {
        const next = updater(prev);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const updateSlide = useCallback(
    (slideIndex: number, updater: (slide: Slide) => Slide) => {
      update((prev) => ({
        ...prev,
        slides: prev.slides.map((s, i) => (i === slideIndex ? updater(s) : s)),
      }));
    },
    [update]
  );

  const addSlide = () => {
    const newSlide: Slide = {
      id: crypto.randomUUID(),
      title: 'New Slide',
      blocks: [{ type: 'text', content: 'Click to edit' }],
      notes: '',
    };
    update((prev) => ({
      ...prev,
      slides: [...prev.slides.slice(0, selectedSlideIndex + 1), newSlide, ...prev.slides.slice(selectedSlideIndex + 1)],
    }));
    setSelectedSlideIndex(selectedSlideIndex + 1);
  };

  const deleteSlide = () => {
    if (presentation.slides.length <= 1) return;
    update((prev) => ({
      ...prev,
      slides: prev.slides.filter((_, i) => i !== selectedSlideIndex),
    }));
    setSelectedSlideIndex(Math.max(0, selectedSlideIndex - 1));
  };

  const duplicateSlide = () => {
    const dup = { ...presentation.slides[selectedSlideIndex], id: crypto.randomUUID() };
    update((prev) => ({
      ...prev,
      slides: [...prev.slides.slice(0, selectedSlideIndex + 1), dup, ...prev.slides.slice(selectedSlideIndex + 1)],
    }));
    setSelectedSlideIndex(selectedSlideIndex + 1);
  };

  const moveSlide = (from: number, to: number) => {
    if (to < 0 || to >= presentation.slides.length) return;
    update((prev) => {
      const slides = [...prev.slides];
      const [moved] = slides.splice(from, 1);
      slides.splice(to, 0, moved);
      return { ...prev, slides };
    });
    setSelectedSlideIndex(to);
  };

  const setTheme = (theme: Theme) => {
    update((prev) => ({ ...prev, theme }));
  };

  const currentSlide = presentation.slides[selectedSlideIndex];

  if (!currentSlide) return null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-100">
      {/* Toolbar */}
      <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-3 shrink-0">
        <label className="text-sm text-gray-600">Theme:</label>
        <select
          className="select w-auto"
          value={
            Object.entries(THEME_PRESETS).find(
              ([, t]) => t.backgroundColor === presentation.theme.backgroundColor && t.accentColor === presentation.theme.accentColor
            )?.[0] || 'custom'
          }
          onChange={(e) => {
            const preset = THEME_PRESETS[e.target.value];
            if (preset) setTheme(preset);
          }}
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="warm">Warm</option>
          <option value="midnight">Midnight</option>
          <option value="custom" disabled>Custom</option>
        </select>

        <div className="h-6 w-px bg-gray-200" />

        <button
          className={`btn-icon ${showNotes ? 'bg-blue-50 text-blue-600' : ''}`}
          onClick={() => setShowNotes(!showNotes)}
          title="Toggle notes"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>

        <span className="text-xs text-gray-400 ml-auto">
          Slide {selectedSlideIndex + 1} of {presentation.slides.length}
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Thumbnail Sidebar */}
        <div className="w-48 bg-white border-r border-gray-200 flex flex-col overflow-hidden shrink-0">
          <div className="flex items-center gap-1 p-2 border-b border-gray-100">
            <button className="btn-icon" onClick={addSlide} title="Add slide">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button className="btn-icon" onClick={duplicateSlide} title="Duplicate slide">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button className="btn-icon" onClick={deleteSlide} title="Delete slide" disabled={presentation.slides.length <= 1}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button className="btn-icon" onClick={() => moveSlide(selectedSlideIndex, selectedSlideIndex - 1)} title="Move up" disabled={selectedSlideIndex === 0}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button className="btn-icon" onClick={() => moveSlide(selectedSlideIndex, selectedSlideIndex + 1)} title="Move down" disabled={selectedSlideIndex === presentation.slides.length - 1}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-2">
            {presentation.slides.map((slide, i) => (
              <div
                key={slide.id}
                className={`slide-thumbnail ${i === selectedSlideIndex ? 'active' : ''}`}
                onClick={() => setSelectedSlideIndex(i)}
              >
                <div
                  className="slide-canvas p-2 rounded"
                  style={{ backgroundColor: presentation.theme.backgroundColor, transform: 'scale(1)', fontSize: '4px' }}
                >
                  <div
                    className="font-bold truncate"
                    style={{ color: presentation.theme.titleColor, fontSize: '6px' }}
                  >
                    {slide.title || 'Untitled'}
                  </div>
                  <div className="mt-0.5 space-y-0.5">
                    {slide.blocks.slice(0, 3).map((block, bi) => (
                      <div key={bi} className="truncate" style={{ color: presentation.theme.textColor, fontSize: '4px' }}>
                        {block.type === 'text' && block.content.substring(0, 30)}
                        {block.type === 'bullets' && `• ${block.items[0] || ''}`.substring(0, 30)}
                        {block.type === 'numbered' && `1. ${block.items[0] || ''}`.substring(0, 30)}
                        {block.type === 'table' && `[Table: ${block.headers.length} cols]`}
                        {block.type === 'quote' && `"${block.content.substring(0, 25)}"`}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-[10px] text-gray-500 text-center py-0.5">{i + 1}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col overflow-auto p-6">
          <div className="mx-auto w-full max-w-4xl">
            <SlideCanvas
              slide={currentSlide}
              theme={presentation.theme}
              onUpdateSlide={(updater) => updateSlide(selectedSlideIndex, updater)}
            />

            {showNotes && (
              <div className="mt-4 bg-white rounded-lg border border-gray-200 p-4">
                <label className="text-xs font-medium text-gray-500 mb-2 block">Speaker Notes</label>
                <textarea
                  className="w-full text-sm text-gray-700 resize-none focus:outline-none min-h-[80px]"
                  value={currentSlide.notes}
                  onChange={(e) =>
                    updateSlide(selectedSlideIndex, (s) => ({ ...s, notes: e.target.value }))
                  }
                  placeholder="Add speaker notes..."
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
