import { Song } from '../../types/midi';
import { buildBar, NoteTuple, sortSongNotes } from '../songHelpers';

type MelStep = [number, number, number, NoteTuple[4], 1 | 2 | 3 | 4 | 5];

function themeHalfBar(
  lhRoot: number,
  lhFifth: number,
  lhRootFinger: 1 | 2 | 3 | 4 | 5,
  lhFifthFinger: 1 | 2 | 3 | 4 | 5,
  rh: MelStep[]
): NoteTuple[] {
  const lh: NoteTuple[] = [
    [0.0, 2.0, lhRoot, 'L', 'root', lhRootFinger, true],
    [2.0, 2.0, lhFifth, 'L', 'fifth', lhFifthFinger],
  ];
  return [...lh, ...rh.map(([off, dur, midi, role, f]): NoteTuple => [off, dur, midi, 'R', role, f])];
}

function themePulseBar(
  lhNotes: [number, number, number, number],
  lhFingers: [1 | 2 | 3 | 4 | 5, 1 | 2 | 3 | 4 | 5],
  rh: MelStep[]
): NoteTuple[] {
  const [n0, n1, n2, n3] = lhNotes;
  const [fRoot, fTop] = lhFingers;
  const lh: NoteTuple[] = [
    [0.0, 1.0, n0, 'L', 'root', fRoot, true],
    [1.0, 1.0, n1, 'L', 'fifth', fTop],
    [2.0, 1.0, n2, 'L', 'third', fRoot],
    [3.0, 1.0, n3, 'L', 'fifth', fTop],
  ];
  return [...lh, ...rh.map(([off, dur, midi, role, f]): NoteTuple => [off, dur, midi, 'R', role, f])];
}

const MEL_GM: MelStep[] = [
  [0.0, 1.5, 79, 'root', 5], [1.5, 0.5, 77, 'melody', 4], [2.0, 1.0, 75, 'melody', 3], [3.0, 1.0, 74, 'fifth', 2],
];
const MEL_CM: MelStep[] = [
  [0.0, 2.0, 72, 'root', 2], [2.0, 1.0, 75, 'third', 4], [3.0, 1.0, 72, 'root', 2],
];
const MEL_F: MelStep[] = [
  [0.0, 1.5, 77, 'root', 5], [1.5, 0.5, 75, 'melody', 4], [2.0, 1.0, 74, 'melody', 3], [3.0, 1.0, 72, 'fifth', 2],
];
const MEL_BB: MelStep[] = [
  [0.0, 2.0, 70, 'root', 1], [2.0, 1.0, 74, 'third', 3], [3.0, 1.0, 70, 'root', 1],
];
const MEL_EB: MelStep[] = [
  [0.0, 1.5, 75, 'root', 5], [1.5, 0.5, 74, 'melody', 4], [2.0, 1.0, 72, 'melody', 3], [3.0, 1.0, 70, 'fifth', 2],
];
const MEL_CM_2: MelStep[] = [
  [0.0, 1.5, 72, 'root', 4], [1.5, 0.5, 70, 'melody', 3], [2.0, 1.0, 69, 'melody', 2], [3.0, 1.0, 67, 'fifth', 1],
];
const MEL_D: MelStep[] = [
  [0.0, 1.0, 66, 'third', 1], [1.0, 1.0, 69, 'fifth', 2], [2.0, 2.0, 74, 'root', 5],
];
const MEL_GM_END: MelStep[] = [
  [0.0, 1.0, 70, 'third', 3], [1.0, 1.0, 69, 'melody', 2], [2.0, 2.0, 67, 'root', 1],
];
const MEL_GM_FINAL: MelStep[] = [
  [0.0, 1.0, 70, 'third', 2], [1.0, 1.0, 74, 'fifth', 3], [2.0, 2.0, 79, 'root', 5],
];

const PROGRESSION = [
  { symbol: 'Gm', rootMidi: 55 },
  { symbol: 'Cm', rootMidi: 48 },
  { symbol: 'F', rootMidi: 53 },
  { symbol: 'Bb', rootMidi: 58 },
  { symbol: 'Eb', rootMidi: 51 },
  { symbol: 'Cm', rootMidi: 48 },
  { symbol: 'D', rootMidi: 50 },
  { symbol: 'Gm', rootMidi: 55 },
];

export const classicPassacagliaEasy: Song = {
  id: 'classic-passacaglia-easy',
  title: 'Klassiker: Passacaglia (Nivå 1 — Tema)',
  bpm: 76,
  timeSignature: [4, 4],
  sections: [
    {
      id: 'passacaglia-easy-1',
      name: 'Del 1: G-moll Tema',
      startBeat: 0,
      endBeat: 32,
      chords: PROGRESSION.map((c, idx) => ({ beat: idx * 4, ...c })),
    },
    {
      id: 'passacaglia-easy-2',
      name: 'Del 2: Utvecklad Bas & Lyft',
      startBeat: 32,
      endBeat: 66,
      chords: PROGRESSION.map((c, idx) => ({ beat: 32 + idx * 4, ...c })),
    },
  ],
  notes: sortSongNotes([
    ...buildBar(0, themeHalfBar(55, 62, 5, 1, MEL_GM)),
    ...buildBar(4, themeHalfBar(48, 55, 5, 1, MEL_CM)),
    ...buildBar(8, themeHalfBar(53, 60, 5, 1, MEL_F)),
    ...buildBar(12, themeHalfBar(58, 65, 5, 1, MEL_BB)),
    ...buildBar(16, themeHalfBar(51, 58, 5, 1, MEL_EB)),
    ...buildBar(20, themeHalfBar(48, 55, 5, 1, MEL_CM_2)),
    ...buildBar(24, themeHalfBar(50, 57, 5, 1, MEL_D)),
    ...buildBar(28, themeHalfBar(55, 62, 5, 1, MEL_GM_END)),
    ...buildBar(32, themePulseBar([55, 62, 58, 62], [5, 1], MEL_GM)),
    ...buildBar(36, themePulseBar([48, 55, 60, 55], [5, 1], MEL_CM)),
    ...buildBar(40, themePulseBar([53, 60, 57, 60], [5, 1], MEL_F)),
    ...buildBar(44, themePulseBar([58, 65, 62, 65], [5, 1], MEL_BB)),
    ...buildBar(48, themePulseBar([51, 58, 55, 58], [5, 1], MEL_EB)),
    ...buildBar(52, themePulseBar([48, 55, 60, 55], [5, 1], MEL_CM_2)),
    ...buildBar(56, themePulseBar([50, 57, 54, 57], [5, 1], MEL_D)),
    ...buildBar(60, themePulseBar([55, 62, 58, 55], [5, 1], MEL_GM_FINAL)),
  ]),
};
