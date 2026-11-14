import { MIDI_MAX, MIDI_MIN } from '../types/midi';

const BASE_CODE_TO_MIDI: Record<string, number> = {
  KeyA: 48, // C3
  KeyW: 49, // C#3
  KeyS: 50, // D3
  KeyE: 51, // D#3
  KeyD: 52, // E3
  KeyF: 53, // F3
  KeyT: 54, // F#3
  KeyG: 55, // G3
  KeyY: 56, // G#3
  KeyH: 57, // A3
  KeyU: 58, // A#3
  KeyJ: 59, // B3
  KeyK: 60, // C4
  KeyO: 61, // C#4
  KeyL: 62, // D4
  KeyP: 63, // D#4
  Semicolon: 64, // E4
  Quote: 65, // F4
  BracketLeft: 66, // F#4
};

const CODE_TO_LABEL: Record<string, string> = {
  KeyA: 'A', KeyW: 'W', KeyS: 'S', KeyE: 'E', KeyD: 'D',
  KeyF: 'F', KeyT: 'T', KeyG: 'G', KeyY: 'Y', KeyH: 'H',
  KeyU: 'U', KeyJ: 'J', KeyK: 'K', KeyO: 'O', KeyL: 'L',
  KeyP: 'P', Semicolon: ';', Quote: "'", BracketLeft: '[',
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

export function getQwertyLabelMap(octaveShift = 0): Record<number, string> {
  const result: Record<number, string> = {};
  for (const [code, base] of Object.entries(BASE_CODE_TO_MIDI)) {
    const shifted = base + octaveShift;
    if (shifted >= MIDI_MIN && shifted <= MIDI_MAX) {
      result[shifted] = CODE_TO_LABEL[code] ?? code;
    }
  }
  return result;
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
