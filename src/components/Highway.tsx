import { MutableRefObject, useCallback, useEffect, useRef } from 'react';
import { HandIsolation, SongNote } from '../types/midi';
import { drawHighwayFrame, HighwayPlaybackState } from './highwayDraw';

export interface HighwayProps {
  notes: SongNote[];
  timeSignature: [number, number];
  handIsolation: HandIsolation;
  playing: boolean;
  getPlaybackState: () => HighwayPlaybackState;
  drawRef?: MutableRefObject<(() => void) | null>;
}

export function Highway({
  notes,
  timeSignature,
  handIsolation,
  playing,
  getPlaybackState,
  drawRef,
}: HighwayProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const stateGetterRef = useRef(getPlaybackState);
  stateGetterRef.current = getPlaybackState;

  const drawOnce = useCallback(() => {
    const canvas = canvasRef.current;
    const { width, height } = sizeRef.current;
    if (!canvas || width <= 0 || height <= 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawHighwayFrame(ctx, width, height, {
      notes,
      timeSignature,
      handIsolation,
      state: stateGetterRef.current(),
    });
  }, [notes, timeSignature, handIsolation]);

  useEffect(() => {
    const el = containerRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;

    const syncSize = () => {
      const rect = el.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeRef.current = { width: rect.width, height: rect.height };
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      const ctx = canvas.getContext('2d');
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawOnce();
    };

    syncSize();
    const ro = new ResizeObserver(syncSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [drawOnce]);

  // INVARIANT: Single rAF ownership lives in usePracticeEngine; Highway redraws on resize, prop updates, or drawRef().
  useEffect(() => {
    if (drawRef) drawRef.current = drawOnce;
    drawOnce();
    return () => {
      if (drawRef) drawRef.current = null;
    };
  }, [playing, drawOnce, drawRef]);

  return (
    <div ref={containerRef} className="relative min-h-[260px] w-full flex-1 overflow-hidden bg-[#0B0F19]">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
