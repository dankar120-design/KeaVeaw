import { ChordMarker, KeyLayout, SongNote } from '../types/midi';
import { intervalLabel } from '../utils/musicTheory';

const REFERENCE_NAMES = new Set(['C3', 'C4', 'C5', 'G5']);

export interface KeyVisualState {
  isActive: boolean;
  isSustained: boolean;
  waiting?: SongNote;
  inChord: boolean;
  activeChord: ChordMarker | null;
}

export interface KeyVisuals {
  baseBg: string;
  waitBorder: string;
  sustainRing: string;
  focusClass: string;
  heightClass: string;
  interval: string;
  showRef: boolean;
  waitingPad: { label: string; className: string } | null;
}

// INVARIANT: Waiting keys keep ring-[3px] and waitingPad even when held (isRestrike) so post-reset keys never look accepted; sustainRing stays suppressed while waiting.
export function getKeyVisuals(k: KeyLayout, s: KeyVisualState): KeyVisuals {
  const isWaiting = Boolean(s.waiting);
  const isRestrike = isWaiting && s.isActive;
  const waitBorder = isWaiting
    ? s.waiting!.hand === 'R'
      ? 'ring-[3px] ring-inset ring-cyan-400'
      : 'ring-[3px] ring-inset ring-amber-400'
    : '';

  const baseBg = k.isBlack
    ? s.isActive
      ? 'bg-cyan-400 text-slate-950'
      : s.inChord
        ? 'bg-slate-700 text-slate-200 border-slate-600'
        : 'bg-slate-900 text-slate-300 border-slate-700'
    : s.isActive
      ? 'bg-cyan-300 text-slate-950'
      : s.inChord
        ? 'bg-sky-50 text-slate-900'
        : 'bg-slate-100 text-slate-800';

  const sustainRing =
    s.isSustained && !s.isActive && !s.waiting ? 'ring-2 ring-inset ring-emerald-400/80' : '';
  const focusClass = k.isBlack ? 'focus-visible:outline-cyan-300' : 'focus-visible:outline-slate-950';
  const heightClass = k.isBlack
    ? 'z-10 h-[62%] rounded-b-md border shadow-md'
    : 'z-0 h-full rounded-b border border-slate-400';

  const interval =
    !k.isBlack && isWaiting && !s.isActive && s.activeChord ? intervalLabel(k.midi, s.activeChord.rootMidi) : '';
  const showRef = !k.isBlack && REFERENCE_NAMES.has(k.name);

  let waitingPad: { label: string; className: string } | null = null;
  if (isWaiting && s.waiting) {
    const handTag = s.waiting.hand === 'L' ? 'V' : 'H';
    const finger = s.waiting.finger ? 'F' + s.waiting.finger : '';
    const baseLabel = [handTag, finger].filter(Boolean).join('·');
    const label = isRestrike ? (k.isBlack ? `↻${handTag}` : `↻ ${baseLabel}`) : baseLabel;
    const padColors = isRestrike
      ? (s.waiting.hand === 'R' ? 'bg-slate-950 text-cyan-300' : 'bg-slate-950 text-amber-300')
      : (s.waiting.hand === 'R' ? 'bg-cyan-400 text-slate-950' : 'bg-amber-400 text-slate-950');
    const padSize = k.isBlack
      ? 'px-0.5 py-0.5 text-[9px]'
      : 'w-[calc(100%-6px)] py-0.5 text-center text-[10px]';
    waitingPad = {
      label,
      className: `pointer-events-none mb-1 whitespace-nowrap rounded font-bold leading-none shadow-sm ${padColors} ${padSize}`,
    };
  }

  return { baseBg, waitBorder, sustainRing, focusClass, heightClass, interval, showRef, waitingPad };
}
