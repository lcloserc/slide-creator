import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import type { PresentationData } from '../types';
import { SlideCanvas } from './SlideCanvas';

export function PresentationMode() {
  const editorTarget = useStore((s) => s.editorTarget);
  const setPresentationMode = useStore((s) => s.setPresentationMode);
  const [slideIndex, setSlideIndex] = useState(0);
  const [showNotes, setShowNotes] = useState(false);

  let presentation: PresentationData | null = null;
  if (editorTarget.type === 'resource' && editorTarget.resource.contentJson) {
    presentation = editorTarget.resource.contentJson;
  } else if (editorTarget.type === 'slide_template') {
    presentation = editorTarget.item.templateData;
  }

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!presentation) return;
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault();
          setSlideIndex((i) => Math.min(i + 1, presentation!.slides.length - 1));
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          setSlideIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Escape':
          setPresentationMode(false);
          break;
        case 'n':
        case 'N':
          setShowNotes((v) => !v);
          break;
      }
    },
    [presentation, setPresentationMode]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => {
      document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  if (!presentation) {
    setPresentationMode(false);
    return null;
  }

  const slide = presentation.slides[slideIndex];
  if (!slide) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center cursor-pointer"
      onClick={(e) => {
        if ((e.target as HTMLElement).tagName !== 'BUTTON') {
          setSlideIndex((i) => Math.min(i + 1, presentation!.slides.length - 1));
        }
      }}
    >
      <div className="w-full h-full flex items-center justify-center p-4">
        <div className="w-full max-w-[90vw] max-h-[90vh]">
          <SlideCanvas
            slide={slide}
            theme={presentation.theme}
            onUpdateSlide={() => {}}
            readOnly
          />
        </div>
      </div>

      {/* Slide counter */}
      <div className="absolute bottom-4 right-4 text-white/50 text-sm">
        {slideIndex + 1} / {presentation.slides.length}
      </div>

      {/* Exit button */}
      <button
        className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
        onClick={(e) => { e.stopPropagation(); setPresentationMode(false); }}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Notes overlay */}
      {showNotes && slide.notes && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white p-6 max-h-[30vh] overflow-y-auto">
          <p className="text-xs text-white/50 mb-1 font-medium">Speaker Notes (press N to toggle)</p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{slide.notes}</p>
        </div>
      )}
    </div>
  );
}
