import { MIDI_MAX, MIDI_MIN } from '../types/midi';

const BASE_CODE_TO_MIDI: Record<string, number> = {
  KeyA: 53, // F3
  KeyW: 54, // F#3
  KeyS: 55, // G3
  KeyE: 56, // G#3
  KeyD: 57, // A3
  KeyR: 58, // A#3
  KeyF: 59, // B3
  KeyG: 60, // C4
  KeyY: 61, // C#4
  KeyH: 62, // D4
  KeyU: 63, // D#4
  KeyJ: 64, // E4
  KeyK: 65, // F4
  KeyO: 66, // F#4
  KeyL: 67, // G4
  KeyP: 68, // G#4
  Semicolon: 69, // A4
  BracketLeft: 70, // A#4
  Quote: 71, // B4
};

const BLOCKED_TAGS = new Set(['INPUT', 'SELECT', 'TEXTAREA', 'OPTION']);

export interface PlayableKeyEventLike {
  repeat: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  target: EventTarget | null;
}

export function isPlayableTargetEvent(e: Omit<PlayableKeyEventLike, 'repeat'> | PlayableKeyEventLike): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  const el = e.target as { tagName?: string; isContentEditable?: boolean } | null;
  if (!el) return true;
  if (el.isContentEditable) return false;
  return !el.tagName || !BLOCKED_TAGS.has(el.tagName.toUpperCase());
}

export function isPlayableKeyEvent(e: PlayableKeyEventLike): boolean {
  return !e.repeat && isPlayableTargetEvent(e);
}

export function mapCodeToMidi(code: string, octaveShift = 0): number | null {
  const base = BASE_CODE_TO_MIDI[code];
  if (base === undefined) return null;
  const shifted = base + octaveShift;
  return shifted >= MIDI_MIN && shifted <= MIDI_MAX ? shifted : null;
}

export function getOctaveDeltaFromCode(code: string): -12 | 12 | 0 {
  if (code === 'KeyZ') return -12;
  if (code === 'KeyX') return 12;
  return 0;
}

// INVARIANT: Flush active QWERTY keys before shifting octaves so keyup after shift never leaves stuck voices.
export function applyOctaveShift(
  currentShift: number,
  delta: -12 | 12,
  heldCodes: Map<string, number>,
  onReleaseMidi: (midi: number) => void
): number {
  for (const midi of heldCodes.values()) onReleaseMidi(midi);
  heldCodes.clear();
  return Math.max(0, Math.min(24, currentShift + delta));
}
