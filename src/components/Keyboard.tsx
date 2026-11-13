import { useMemo, useRef } from 'react';
import { ChordMarker, SongNote } from '../types/midi';
import { KEY_LAYOUTS, chordPitchClasses, intervalLabel } from '../utils/musicTheory';

export interface KeyboardProps {
  activeNotes: Set<number>;
  sustainedNotes: Set<number>;
  waitingNotes: SongNote[];
  activeChord: ChordMarker | null;
  onNoteOn: (midi: number) => void;
  onNoteOff: (midi: number) => void;
}

const REFERENCE_NAMES = new Set(['F3', 'C4', 'C5', 'C6']);

export function Keyboard({
  activeNotes,
  sustainedNotes,
  waitingNotes,
  activeChord,
  onNoteOn,
  onNoteOff,
}: KeyboardProps) {
  const pointerMap = useRef<Map<number, number>>(new Map());

  const chordPcs = useMemo(
    () => (activeChord ? chordPitchClasses(activeChord.symbol) : new Set<number>()),
    [activeChord]
  );

  const waitingMap = useMemo(() => {
    const map = new Map<number, SongNote>();
    for (const w of waitingNotes) map.set(w.midi, w);
    return map;
  }, [waitingNotes]);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>, midi: number) => {
    e.preventDefault();
    if (pointerMap.current.has(e.pointerId)) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointerMap.current.set(e.pointerId, midi);
    onNoteOn(midi);
  };

  // INVARIANT: Track pointerId -> midi in a Map so multi-touch and fast slides release every captured key.
  const handlePointerRelease = (e: React.PointerEvent<HTMLButtonElement>) => {
    const midi = pointerMap.current.get(e.pointerId);
    if (midi === undefined) return;
    pointerMap.current.delete(e.pointerId);
    onNoteOff(midi);
  };

  const renderKey = (k: (typeof KEY_LAYOUTS)[number]) => {
    const isActive = activeNotes.has(k.midi);
    const isSustained = sustainedNotes.has(k.midi);
    const waiting = waitingMap.get(k.midi);
    const inChord = chordPcs.has(k.midi % 12);

    const waitBorder = waiting
      ? waiting.hand === 'R'
        ? 'ring-2 ring-inset ring-cyan-400 bg-cyan-500/30'
        : 'ring-2 ring-inset ring-amber-400 bg-amber-500/30'
      : '';

    const baseBg = k.isBlack
      ? isActive
        ? 'bg-cyan-400 text-slate-950'
        : inChord
          ? 'bg-slate-700 text-slate-200 border-slate-600'
          : 'bg-slate-900 text-slate-300 border-slate-700'
      : isActive
        ? 'bg-cyan-300 text-slate-950'
        : inChord
          ? 'bg-sky-50 text-slate-900'
          : 'bg-slate-100 text-slate-800';

    const sustainRing = isSustained && !isActive ? 'ring-2 ring-inset ring-emerald-400/80' : '';
    const heightClass = k.isBlack ? 'z-10 h-[62%] rounded-b-md border shadow-md' : 'z-0 h-full rounded-b border border-slate-400';

    const interval = waiting && activeChord ? intervalLabel(k.midi, activeChord.rootMidi) : '';
    const finger = waiting?.finger ? `F${waiting.finger}` : '';
    const showRef = !k.isBlack && REFERENCE_NAMES.has(k.name);

    return (
      <button
        key={k.midi}
        type="button"
        aria-label={k.name}
        onPointerDown={(e) => handlePointerDown(e, k.midi)}
        onPointerUp={handlePointerRelease}
        onPointerCancel={handlePointerRelease}
        onLostPointerCapture={handlePointerRelease}
        style={{ left: `${k.xNorm * 100}%`, width: `${k.wNorm * 100}%` }}
        className={`absolute top-0 flex flex-col items-center justify-end pb-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white focus-visible:z-20 ${heightClass} ${baseBg} ${waitBorder} ${sustainRing}`}
      >
        {(interval || finger) && (
          <span className="mb-1 rounded bg-slate-950/85 px-1 py-0.5 text-[10px] font-semibold leading-none text-white">
            {[interval, finger].filter(Boolean).join('·')}
          </span>
        )}
        {showRef && <span className="text-[10px] font-medium text-slate-500">{k.name}</span>}
      </button>
    );
  };

  const whites = KEY_LAYOUTS.filter((k) => !k.isBlack);
  const blacks = KEY_LAYOUTS.filter((k) => k.isBlack);

  return (
    <div className="relative h-44 w-full shrink-0 select-none overflow-hidden bg-slate-950 touch-none">
      {whites.map(renderKey)}
      {blacks.map(renderKey)}
    </div>
  );
}
