import { KeyLayout, MIDI_MAX, MIDI_MIN } from '../types/midi';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const BLACK_PCS = new Set([1, 3, 6, 8, 10]);
const INTERVAL_LABELS = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];

const PC_MAP: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

const CHORD_INTERVALS: Record<string, number[]> = {
  '': [0, 4, 7],
  maj: [0, 4, 7],
  m: [0, 3, 7],
  min: [0, 3, 7],
  '7': [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  dim: [0, 3, 6],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
};

export function isBlackKey(midi: number): boolean {
  return BLACK_PCS.has(((midi % 12) + 12) % 12);
}

export function midiToName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[((midi % 12) + 12) % 12]}${octave}`;
}

export function clampToRange(midi: number): number {
  return Math.max(MIDI_MIN, Math.min(MIDI_MAX, Math.round(midi)));
}

export function computeOctaveOffset(rawMidi: number): number {
  if (rawMidi < MIDI_MIN) return Math.ceil((MIDI_MIN - rawMidi) / 12) * 12;
  if (rawMidi > MIDI_MAX) return -Math.ceil((rawMidi - MIDI_MAX) / 12) * 12;
  return 0;
}

export function chordPitchClasses(symbol: string): Set<number> {
  const match = /^([A-G][#b]?)(.*)$/.exec(symbol.trim());
  if (!match) return new Set();
  const rootPc = PC_MAP[match[1]];
  if (rootPc === undefined) return new Set();
  const intervals = CHORD_INTERVALS[match[2]] ?? CHORD_INTERVALS[''];
  return new Set(intervals.map((iv) => (rootPc + iv) % 12));
}

export function intervalLabel(midi: number, rootMidi: number): string {
  return INTERVAL_LABELS[(((midi - rootMidi) % 12) + 12) % 12];
}

export const WHITE_KEY_COUNT = 19;

export const KEY_LAYOUTS: KeyLayout[] = (() => {
  const layouts: KeyLayout[] = [];
  const whiteW = 1 / WHITE_KEY_COUNT;
  const blackW = whiteW * 0.62;
  let whiteIdx = 0;

  for (let midi = MIDI_MIN; midi <= MIDI_MAX; midi++) {
    const black = isBlackKey(midi);
    if (!black) {
      layouts.push({
        midi,
        name: midiToName(midi),
        isBlack: false,
        xNorm: whiteIdx * whiteW,
        wNorm: whiteW,
      });
      whiteIdx++;
    } else {
      layouts.push({
        midi,
        name: midiToName(midi),
        isBlack: true,
        xNorm: whiteIdx * whiteW - blackW / 2,
        wNorm: blackW,
      });
    }
  }
  return layouts;
})();

export const KEY_LAYOUT_MAP: Record<number, KeyLayout> = Object.fromEntries(
  KEY_LAYOUTS.map((k) => [k.midi, k])
);
