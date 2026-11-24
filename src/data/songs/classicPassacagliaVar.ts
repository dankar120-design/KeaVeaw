import { Song } from '../../types/midi';
import { buildBar, NoteTuple, sortSongNotes } from '../songHelpers';

type EightStep = [number, NoteTuple[4], 1 | 2 | 3 | 4 | 5];

function arpVarBar(
  lhRoot: number,
  lhFifth: number,
  lhFingers: [1 | 2 | 3 | 4 | 5, 1 | 2 | 3 | 4 | 5],
  rhSteps: EightStep[]
): NoteTuple[] {
  const lh: NoteTuple[] = [
    [0.0, 2.0, lhRoot, 'L', 'root', lhFingers[0], true],
    [2.0, 2.0, lhFifth, 'L', 'fifth', lhFingers[1]],
  ];
  const rh: NoteTuple[] = rhSteps.map(([m, role, f], i) => [i * 0.5, 0.5, m, 'R', role, f]);
  return [...lh, ...rh];
}

function cascadeVarBar(
  lhPattern: [number, number, number, number],
  lhFingers: [1 | 2 | 3 | 4 | 5, 1 | 2 | 3 | 4 | 5],
  rhSteps: EightStep[]
): NoteTuple[] {
  const [n0, n1, n2, n3] = lhPattern;
  const [f0, f1] = lhFingers;
  const lh: NoteTuple[] = [
    [0.0, 1.0, n0, 'L', 'root', f0, true],
    [1.0, 1.0, n1, 'L', 'third', f1],
    [2.0, 1.0, n2, 'L', 'fifth', f0],
    [3.0, 1.0, n3, 'L', 'third', f1],
  ];
  const rh: NoteTuple[] = rhSteps.map(([m, role, f], i) => [i * 0.5, 0.5, m, 'R', role, f]);
  return [...lh, ...rh];
}

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

export const classicPassacagliaVar: Song = {
  id: 'classic-passacaglia-var',
  title: 'Klassiker: Passacaglia (Nivå 2 — Variation)',
  bpm: 84,
  timeSignature: [4, 4],
  sections: [
    {
      id: 'passacaglia-var-1',
      name: 'Del 1: Åttondelsvariation (Arpeggio)',
      startBeat: 0,
      endBeat: 32,
      chords: PROGRESSION.map((c, idx) => ({ beat: idx * 4, ...c })),
    },
    {
      id: 'passacaglia-var-2',
      name: 'Del 2: Kaskad & Höjdpunkt',
      startBeat: 32,
      endBeat: 66,
      chords: PROGRESSION.map((c, idx) => ({ beat: 32 + idx * 4, ...c })),
    },
  ],
  notes: sortSongNotes([
    ...buildBar(0, arpVarBar(55, 62, [5, 1], [
      [70, 'third', 1], [74, 'fifth', 2], [79, 'root', 5], [74, 'fifth', 2],
      [70, 'third', 1], [74, 'fifth', 2], [77, 'seventh', 4], [74, 'fifth', 2],
    ])),
    ...buildBar(4, arpVarBar(48, 55, [5, 1], [
      [72, 'root', 1], [75, 'third', 3], [79, 'fifth', 5], [75, 'third', 3],
      [72, 'root', 2], [75, 'third', 4], [72, 'root', 2], [70, 'seventh', 1],
    ])),
    ...buildBar(8, arpVarBar(53, 60, [5, 1], [
      [69, 'third', 1], [72, 'fifth', 2], [77, 'root', 5], [72, 'fifth', 2],
      [69, 'third', 1], [72, 'fifth', 2], [75, 'seventh', 4], [72, 'fifth', 2],
    ])),
    ...buildBar(12, arpVarBar(58, 65, [5, 1], [
      [70, 'root', 1], [74, 'third', 3], [77, 'fifth', 5], [74, 'third', 3],
      [70, 'root', 2], [74, 'third', 4], [70, 'root', 2], [69, 'melody', 1],
    ])),
    ...buildBar(16, arpVarBar(51, 58, [5, 1], [
      [67, 'third', 1], [70, 'fifth', 2], [75, 'root', 5], [70, 'fifth', 2],
      [67, 'third', 1], [70, 'fifth', 2], [74, 'seventh', 4], [70, 'fifth', 2],
    ])),
    ...buildBar(20, arpVarBar(48, 55, [5, 1], [
      [67, 'fifth', 1], [72, 'root', 3], [75, 'third', 5], [72, 'root', 3],
      [67, 'fifth', 1], [72, 'root', 3], [70, 'melody', 2], [67, 'fifth', 1],
    ])),
    ...buildBar(24, arpVarBar(50, 57, [5, 1], [
      [66, 'third', 1], [69, 'fifth', 2], [74, 'root', 5], [69, 'fifth', 2],
      [66, 'third', 1], [69, 'fifth', 2], [72, 'seventh', 4], [69, 'fifth', 2],
    ])),
    ...buildBar(28, arpVarBar(55, 62, [5, 1], [
      [67, 'root', 1], [70, 'third', 2], [74, 'fifth', 4], [70, 'third', 2],
      [67, 'root', 1], [70, 'third', 2], [74, 'fifth', 4], [79, 'root', 5],
    ])),
    ...buildBar(32, cascadeVarBar([55, 58, 62, 58], [5, 1], [
      [79, 'root', 5], [77, 'melody', 4], [75, 'melody', 3], [74, 'fifth', 2],
      [75, 'melody', 3], [74, 'fifth', 2], [72, 'melody', 1], [74, 'fifth', 2],
    ])),
    ...buildBar(36, cascadeVarBar([48, 51, 55, 51], [5, 2], [
      [75, 'third', 4], [74, 'melody', 3], [72, 'root', 2], [70, 'melody', 1],
      [72, 'root', 2], [75, 'third', 4], [79, 'fifth', 5], [75, 'third', 3],
    ])),
    ...buildBar(40, cascadeVarBar([53, 57, 60, 57], [5, 1], [
      [77, 'root', 5], [75, 'seventh', 4], [74, 'melody', 3], [72, 'fifth', 2],
      [74, 'melody', 3], [72, 'fifth', 2], [70, 'melody', 1], [72, 'fifth', 2],
    ])),
    ...buildBar(44, cascadeVarBar([58, 62, 65, 62], [5, 1], [
      [74, 'third', 4], [72, 'melody', 3], [70, 'root', 2], [69, 'melody', 1],
      [70, 'root', 2], [74, 'third', 4], [77, 'fifth', 5], [74, 'third', 3],
    ])),
    ...buildBar(48, cascadeVarBar([51, 55, 58, 55], [5, 1], [
      [75, 'root', 5], [74, 'seventh', 4], [72, 'melody', 3], [70, 'fifth', 2],
      [67, 'third', 1], [70, 'fifth', 2], [75, 'root', 5], [70, 'fifth', 2],
    ])),
    ...buildBar(52, cascadeVarBar([48, 51, 55, 51], [5, 2], [
      [72, 'root', 4], [70, 'seventh', 3], [67, 'fifth', 2], [65, 'melody', 1],
      [67, 'fifth', 2], [72, 'root', 4], [75, 'third', 5], [72, 'root', 3],
    ])),
    ...buildBar(56, cascadeVarBar([50, 54, 57, 54], [5, 1], [
      [74, 'root', 5], [72, 'seventh', 4], [69, 'fifth', 2], [66, 'third', 1],
      [69, 'fifth', 2], [72, 'seventh', 4], [74, 'root', 5], [72, 'seventh', 4],
    ])),
    ...buildBar(60, cascadeVarBar([55, 58, 62, 58], [5, 1], [
      [70, 'third', 2], [74, 'fifth', 3], [79, 'root', 5], [74, 'fifth', 3],
      [70, 'third', 2], [67, 'root', 1], [74, 'fifth', 3], [79, 'root', 5],
    ])),
  ]),
};
