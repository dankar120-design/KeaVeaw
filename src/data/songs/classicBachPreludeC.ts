import { ChordMarker, Song } from '../../types/midi';
import { buildBar, NoteTuple, sortSongNotes } from '../songHelpers';

type BachBar = readonly [string, number, number, number, number, number, number];

// BWV 846 takter 1–32 i Keystation 32-omfång (48..79); G2/C2 lyfts 1 oktav till G3/C3
const BARS: readonly BachBar[] = [
  ['C', 60, 60, 64, 67, 72, 76], ['Dm7/C', 62, 60, 62, 69, 74, 77],
  ['G7/B', 55, 59, 62, 67, 74, 77], ['C', 60, 60, 64, 67, 72, 76],
  ['Am/C', 57, 60, 64, 69, 72, 76], ['D7/C', 50, 60, 62, 66, 72, 74],
  ['G/B', 55, 59, 62, 67, 74, 79], ['Cmaj7/B', 60, 59, 60, 67, 72, 76],
  ['Am7', 57, 57, 60, 67, 72, 76], ['D7', 50, 50, 57, 62, 66, 72],
  ['G', 55, 55, 59, 62, 67, 71], ['C#dim7/G', 49, 55, 58, 64, 67, 73],
  ['Dm/F', 50, 53, 57, 62, 69, 74], ['Bdim7/F', 59, 53, 56, 62, 65, 71],
  ['C/E', 48, 52, 55, 60, 67, 72], ['Fmaj7/E', 53, 52, 53, 57, 60, 65],
  ['Dm7', 50, 50, 53, 57, 60, 65], ['G7', 55, 55, 62, 67, 71, 77],
  ['C', 48, 48, 55, 60, 64, 72], ['C7', 48, 48, 55, 58, 60, 64],
  ['Fmaj7', 53, 53, 65, 69, 72, 76], ['F#dim7', 54, 54, 60, 69, 72, 75],
  ['Abdim7', 56, 56, 65, 71, 74, 77], ['G7', 55, 55, 65, 67, 71, 74],
  ['C/G', 48, 55, 64, 67, 72, 76], ['G7sus4', 55, 55, 62, 67, 72, 77],
  ['G7', 55, 55, 62, 67, 71, 77], ['F#dim7/G', 54, 55, 63, 69, 72, 78],
  ['C/G', 48, 55, 64, 67, 72, 79], ['G7sus4', 55, 55, 65, 67, 72, 74],
  ['G7', 55, 55, 65, 67, 71, 74], ['C7', 48, 48, 60, 67, 70, 76],
];

function bachRole(midi: number, rootMidi: number): NoteTuple[4] {
  const iv = ((midi - rootMidi) % 12 + 12) % 12;
  if (iv === 0) return 'root';
  if (iv === 3 || iv === 4) return 'third';
  if (iv === 7) return 'fifth';
  return iv === 10 || iv === 11 ? 'seventh' : 'melody';
}

function bachArpBar([, root, lh1, lh2, rh1, rh2, rh3]: BachBar): NoteTuple[] {
  const r = (m: number) => bachRole(m, root);
  const half = (o: number, clear: boolean): NoteTuple[] => [
    [o, 1.75, lh1, 'L', r(lh1), 5, clear || undefined],
    [o + 0.25, 1.5, lh2, 'L', r(lh2), 2],
    [o + 0.5, 0.25, rh1, 'R', r(rh1), 1],
    [o + 0.75, 0.25, rh2, 'R', r(rh2), 2],
    [o + 1.0, 0.25, rh3, 'R', r(rh3), 5],
    [o + 1.25, 0.25, rh1, 'R', r(rh1), 1],
    [o + 1.5, 0.25, rh2, 'R', r(rh2), 2],
    [o + 1.75, 0.25, rh3, 'R', r(rh3), 5],
  ];
  return [...half(0, true), ...half(2, false)];
}

function cadenceRun(lh2: number, root: number, rhMidis: number[]): NoteTuple[] {
  const r = (m: number) => bachRole(m, root);
  return [
    [0.0, 4.0, 48, 'L', r(48), 5, true],
    [0.25, 3.75, lh2, 'L', r(lh2), 2],
    ...rhMidis.map((m, i): NoteTuple => [0.5 + i * 0.25, 0.25, m, 'R', r(m), ((i % 4) + 1) as 1 | 2 | 3 | 4]),
  ];
}

const CADENCE_CHORDS: ChordMarker[] = [
  { beat: 128, symbol: 'F/C', rootMidi: 53 },
  { beat: 132, symbol: 'G7/C', rootMidi: 55 },
  { beat: 136, symbol: 'C', rootMidi: 48 },
];

const toChords = (slice: readonly BachBar[], baseIndex: number): ChordMarker[] =>
  slice.map(([symbol, rootMidi], i) => ({ beat: (baseIndex + i) * 4, symbol, rootMidi }));

export const classicBachPreludeC: Song = {
  id: 'classic-bach-prelude-c',
  title: 'Klassiker: Bach Preludium i C-dur',
  bpm: 72,
  timeSignature: [4, 4],
  sections: [
    { id: 'bach-c-part-1', name: 'Del 1: Exposition & Modulation (Takt 1–19)', startBeat: 0, endBeat: 76, chords: toChords(BARS.slice(0, 19), 0) },
    { id: 'bach-c-part-2', name: 'Del 2: Orgelpunkt & Kadens (Takt 20–35)', startBeat: 76, endBeat: 142, chords: [...toChords(BARS.slice(19), 19), ...CADENCE_CHORDS] },
  ],
  notes: sortSongNotes([
    ...BARS.flatMap((bar, i) => buildBar(i * 4, bachArpBar(bar))),
    ...buildBar(128, cadenceRun(53, 53, [69, 72, 77, 72, 69, 72, 69, 65, 69, 65, 62, 65, 62, 65])),
    ...buildBar(132, cadenceRun(59, 55, [67, 71, 74, 77, 74, 71, 74, 71, 67, 71, 74, 77, 76, 74])),
    ...buildBar(136, [
      [0.0, 4.0, 48, 'L', 'root', 5, true],
      [0.0, 4.0, 55, 'L', 'fifth', 1],
      [0.0, 4.0, 60, 'R', 'root', 1],
      [0.0, 4.0, 64, 'R', 'third', 2],
      [0.0, 4.0, 67, 'R', 'fifth', 3],
      [0.0, 4.0, 72, 'R', 'root', 5],
    ]),
  ]),
};
