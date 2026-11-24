import { useEffect, useMemo, useRef } from 'react';
import { ChordMarker, SongNote } from '../types/midi';
import { KEY_LAYOUTS, chordPitchClasses } from '../utils/musicTheory';
import {
  clearKeyPointers,
  handleKeyButtonKeyDown,
  handleKeyButtonKeyUp,
  moveKeyPointer,
  pressKeyPointer,
  releaseKeyPointer,
} from './keyboardPointer';
import { getKeyVisuals } from './keyboardVisuals';

export interface KeyboardProps {
  activeNotes: Set<number>;
  sustainedNotes: Set<number>;
  waitingNotes: SongNote[];
  activeChord: ChordMarker | null;
  onNoteOn: (midi: number) => void;
  onNoteOff: (midi: number) => void;
  qwertyLabels?: Record<number, string>;
}

export function Keyboard({
  activeNotes,
  sustainedNotes,
  waitingNotes,
  activeChord,
  onNoteOn,
  onNoteOff,
  qwertyLabels,
}: KeyboardProps) {
  const pointerMap = useRef<Map<number, number | null>>(new Map());
  const pressedEnterMidis = useRef<Set<number>>(new Set());

  useEffect(() => {
    const onBlur = () => {
      clearKeyPointers(pointerMap.current, onNoteOff);
      for (const m of pressedEnterMidis.current) onNoteOff(m);
      pressedEnterMidis.current.clear();
    };
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, [onNoteOff]);

  const chordPcs = useMemo(
    () => (activeChord ? chordPitchClasses(activeChord.symbol) : new Set<number>()),
    [activeChord]
  );

  const waitingMap = useMemo(() => {
    const map = new Map<number, SongNote>();
    for (const w of waitingNotes) map.set(w.midi, w);
    return map;
  }, [waitingNotes]);

  // INVARIANT: Capture pointer on container and track pointerId->midi so multi-touch and glissando slides release properly.
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const target = e.target as HTMLElement | null;
    const rawMidi = (target?.closest?.('[data-midi]') as HTMLElement | null)?.getAttribute('data-midi');
    if (rawMidi) pressKeyPointer(pointerMap.current, e.pointerId, Number(rawMidi), onNoteOn);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerMap.current.has(e.pointerId)) return;
    const hit = typeof document !== 'undefined' ? (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null) : null;
    const rawMidi = (hit?.closest?.('[data-midi]') as HTMLElement | null)?.getAttribute('data-midi');
    moveKeyPointer(pointerMap.current, e.pointerId, rawMidi ? Number(rawMidi) : null, onNoteOn, onNoteOff);
  };

  const handlePointerRelease = (e: React.PointerEvent<HTMLDivElement>) => releaseKeyPointer(pointerMap.current, e.pointerId, onNoteOff);

  const renderKey = (k: (typeof KEY_LAYOUTS)[number]) => {
    const isActive = activeNotes.has(k.midi);
    const isSustained = sustainedNotes.has(k.midi);
    const waiting = waitingMap.get(k.midi);
    const inChord = chordPcs.has(k.midi % 12);
    const v = getKeyVisuals(k, { isActive, isSustained, waiting, inChord, activeChord });
    const label = qwertyLabels?.[k.midi];

    return (
      <button
        key={k.midi}
        type="button"
        data-midi={k.midi}
        aria-label={k.name}
        onKeyDown={(e) => handleKeyButtonKeyDown(e, k.midi, pressedEnterMidis.current, onNoteOn)}
        onKeyUp={(e) => handleKeyButtonKeyUp(e, k.midi, pressedEnterMidis.current, onNoteOff)}
        style={{ left: `${k.xNorm * 100}%`, width: `${k.wNorm * 100}%` }}
        className={`absolute top-0 flex flex-col items-center justify-end pb-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 ${v.focusClass} ${v.heightClass} ${v.baseBg} ${v.waitBorder} ${v.sustainRing}`}
      >
        {k.midi === 60 && <span data-testid="c4-anchor" className="pointer-events-none absolute top-1.5 h-1.5 w-1.5 rounded-full bg-amber-400" />}
        {v.interval && <span className="mb-0.5 text-[9px] font-semibold leading-none text-slate-600">{v.interval}</span>}
        {v.waitingPad && <span data-testid="waiting-pad" className={v.waitingPad.className}>{v.waitingPad.label}</span>}
        {v.showRef && <span className="text-[10px] font-medium leading-none text-slate-500">{k.name}</span>}
        {label && (
          <span data-testid="qwerty-label" className={`pointer-events-none text-[9px] font-semibold leading-none ${k.isBlack ? 'text-slate-400' : 'text-slate-500'}`}>
            {label}
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerRelease}
      onPointerCancel={handlePointerRelease}
      onLostPointerCapture={handlePointerRelease}
      className="relative h-[clamp(112px,24dvh,176px)] w-full shrink-0 select-none overflow-hidden bg-slate-950 touch-none"
    >
      {KEY_LAYOUTS.filter((k) => !k.isBlack).map(renderKey)}
      {KEY_LAYOUTS.filter((k) => k.isBlack).map(renderKey)}
    </div>
  );
}
