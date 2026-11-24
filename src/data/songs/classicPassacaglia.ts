import { Song } from '../../types/midi';
import { buildBar, NoteTuple, sortSongNotes } from '../songHelpers';

type MelStep = [number, number, number, NoteTuple[4], 1 | 2 | 3 | 4 | 5];
type EightStep = [number, NoteTuple[4], 1 | 2 | 3 | 4 | 5];

function simpleBar(bassMidi: number, rh: MelStep[]): NoteTuple[] {
  return [
    [0.0, 3.8, bassMidi, 'L', 'root', 5, true],
    ...rh.map(([off, dur, midi, role, f]): NoteTuple => [off, dur, midi, 'R', role, f]),
  ];
}

function eighthBar(bassMidi: number, rhSteps: EightStep[]): NoteTuple[] {
  return simpleBar(
    bassMidi,
    rhSteps.map(([midi, role, f], i): MelStep => [i * 0.5, 0.5, midi, role, f])
  );
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

const DEL1_RH: MelStep[][] = [
  [[0, 1.5, 79, 'root', 5], [1.5, 0.5, 77, 'melody', 4], [2, 1, 75, 'melody', 3], [3, 1, 74, 'fifth', 2]],
  [[0, 1.5, 72, 'root', 2], [1.5, 0.5, 74, 'melody', 3], [2, 1, 75, 'third', 4], [3, 1, 72, 'root', 2]],
  [[0, 1.5, 77, 'root', 5], [1.5, 0.5, 75, 'melody', 4], [2, 1, 74, 'melody', 3], [3, 1, 72, 'fifth', 2]],
  [[0, 1.5, 70, 'root', 2], [1.5, 0.5, 72, 'melody', 3], [2, 1, 74, 'third', 4], [3, 1, 70, 'root', 2]],
  [[0, 1.5, 75, 'root', 5], [1.5, 0.5, 74, 'melody', 4], [2, 1, 72, 'melody', 3], [3, 1, 70, 'fifth', 2]],
  [[0, 1.5, 72, 'root', 4], [1.5, 0.5, 70, 'melody', 3], [2, 1, 69, 'melody', 2], [3, 1, 67, 'fifth', 1]],
  [[0, 1, 66, 'third', 1], [1, 1, 69, 'fifth', 2], [2, 1.5, 74, 'root', 5], [3.5, 0.5, 72, 'seventh', 4]],
  [[0, 1, 70, 'third', 3], [1, 1, 69, 'melody', 2], [2, 2, 67, 'root', 1]],
];

const DEL2_RH: EightStep[][] = [
  [[79, 'root', 5], [77, 'melody', 4], [75, 'melody', 3], [74, 'fifth', 2], [75, 'melody', 3], [74, 'fifth', 2], [70, 'third', 1], [74, 'fifth', 2]],
  [[72, 'root', 1], [74, 'melody', 2], [75, 'third', 3], [72, 'root', 1], [75, 'third', 3], [79, 'fifth', 5], [75, 'third', 3], [72, 'root', 2]],
  [[77, 'root', 5], [75, 'seventh', 4], [74, 'melody', 3], [72, 'fifth', 2], [74, 'melody', 3], [72, 'fifth', 2], [69, 'third', 1], [72, 'fifth', 2]],
  [[70, 'root', 1], [72, 'melody', 2], [74, 'third', 3], [70, 'root', 1], [74, 'third', 3], [77, 'fifth', 5], [74, 'third', 3], [70, 'root', 2]],
  [[75, 'root', 5], [74, 'seventh', 4], [72, 'melody', 3], [70, 'fifth', 2], [72, 'melody', 3], [70, 'fifth', 2], [67, 'third', 1], [70, 'fifth', 2]],
  [[72, 'root', 4], [70, 'seventh', 3], [69, 'melody', 2], [67, 'fifth', 1], [69, 'melody', 2], [70, 'seventh', 3], [72, 'root', 4], [67, 'fifth', 1]],
  [[66, 'third', 1], [69, 'fifth', 2], [74, 'root', 5], [72, 'seventh', 4], [74, 'root', 5], [69, 'fifth', 2], [72, 'seventh', 4], [66, 'third', 1]],
  [[67, 'root', 1], [69, 'melody', 2], [70, 'third', 3], [74, 'fifth', 4], [79, 'root', 5], [74, 'fifth', 4], [70, 'third', 2], [74, 'fifth', 3]],
];

const DEL3_RH: MelStep[][] = [
  [[0, 0.5, 79, 'root', 5], [0.5, 0.5, 74, 'fifth', 2], [1, 0.25, 79, 'root', 5], [1.25, 0.25, 77, 'melody', 4], [1.5, 0.25, 75, 'melody', 3], [1.75, 0.25, 74, 'fifth', 2], [2, 0.5, 75, 'melody', 3], [2.5, 0.5, 74, 'fifth', 2], [3, 0.5, 70, 'third', 1], [3.5, 0.5, 74, 'fifth', 3]],
  [[0, 0.5, 72, 'root', 1], [0.5, 0.5, 75, 'third', 3], [1, 0.25, 79, 'fifth', 5], [1.25, 0.25, 77, 'melody', 4], [1.5, 0.25, 75, 'third', 3], [1.75, 0.25, 74, 'melody', 2], [2, 0.5, 75, 'third', 3], [2.5, 0.5, 72, 'root', 1], [3, 0.5, 75, 'third', 3], [3.5, 0.5, 79, 'fifth', 5]],
  [[0, 0.5, 77, 'root', 5], [0.5, 0.5, 72, 'fifth', 2], [1, 0.25, 77, 'root', 5], [1.25, 0.25, 75, 'seventh', 4], [1.5, 0.25, 74, 'melody', 3], [1.75, 0.25, 72, 'fifth', 2], [2, 0.5, 74, 'melody', 3], [2.5, 0.5, 72, 'fifth', 2], [3, 0.5, 69, 'third', 1], [3.5, 0.5, 72, 'fifth', 2]],
  [[0, 0.5, 70, 'root', 1], [0.5, 0.5, 74, 'third', 3], [1, 0.25, 77, 'fifth', 5], [1.25, 0.25, 75, 'melody', 4], [1.5, 0.25, 74, 'third', 3], [1.75, 0.25, 72, 'melody', 2], [2, 0.5, 74, 'third', 3], [2.5, 0.5, 70, 'root', 1], [3, 0.5, 74, 'third', 3], [3.5, 0.5, 77, 'fifth', 5]],
  [[0, 0.5, 75, 'root', 5], [0.5, 0.5, 70, 'fifth', 2], [1, 0.25, 75, 'root', 5], [1.25, 0.25, 74, 'seventh', 4], [1.5, 0.25, 72, 'melody', 3], [1.75, 0.25, 70, 'fifth', 2], [2, 0.5, 72, 'melody', 3], [2.5, 0.5, 70, 'fifth', 2], [3, 0.5, 67, 'third', 1], [3.5, 0.5, 70, 'fifth', 2]],
  [[0, 0.5, 72, 'root', 4], [0.5, 0.5, 67, 'fifth', 1], [1, 0.25, 72, 'root', 4], [1.25, 0.25, 70, 'seventh', 3], [1.5, 0.25, 69, 'melody', 2], [1.75, 0.25, 67, 'fifth', 1], [2, 0.5, 69, 'melody', 2], [2.5, 0.5, 70, 'seventh', 3], [3, 0.5, 72, 'root', 4], [3.5, 0.5, 75, 'third', 5]],
  [[0, 0.5, 66, 'third', 1], [0.5, 0.5, 69, 'fifth', 2], [1, 0.25, 74, 'root', 5], [1.25, 0.25, 72, 'seventh', 4], [1.5, 0.25, 70, 'melody', 3], [1.75, 0.25, 69, 'fifth', 2], [2, 0.5, 74, 'root', 5], [2.5, 0.5, 72, 'seventh', 4], [3, 0.5, 69, 'fifth', 2], [3.5, 0.5, 66, 'third', 1]],
  [[0, 0.5, 67, 'root', 1], [0.5, 0.5, 70, 'third', 2], [1, 0.5, 74, 'fifth', 3], [1.5, 0.5, 70, 'third', 2], [2, 2.0, 79, 'root', 5]],
];

export const classicPassacaglia: Song = {
  id: 'classic-passacaglia',
  title: 'Klassiker: Passacaglia (Original — Handel/Halvorsen)',
  bpm: 78,
  timeSignature: [4, 4],
  sections: [
    {
      id: 'passacaglia-orig-1',
      name: 'Del 1: Originaltema & Enkel Bas',
      startBeat: 0,
      endBeat: 32,
      chords: PROGRESSION.map((c, idx) => ({ beat: idx * 4, ...c })),
    },
    {
      id: 'passacaglia-orig-2',
      name: 'Del 2: Åttondelsflöde',
      startBeat: 32,
      endBeat: 64,
      chords: PROGRESSION.map((c, idx) => ({ beat: 32 + idx * 4, ...c })),
    },
    {
      id: 'passacaglia-orig-3',
      name: 'Del 3: Sextondelskaskad & Final',
      startBeat: 64,
      endBeat: 98,
      chords: PROGRESSION.map((c, idx) => ({ beat: 64 + idx * 4, ...c })),
    },
  ],
  notes: sortSongNotes([
    ...DEL1_RH.flatMap((rh, i) => buildBar(i * 4, simpleBar(PROGRESSION[i].rootMidi, rh))),
    ...DEL2_RH.flatMap((rh, i) => buildBar(32 + i * 4, eighthBar(PROGRESSION[i].rootMidi, rh))),
    ...DEL3_RH.flatMap((rh, i) => buildBar(64 + i * 4, simpleBar(PROGRESSION[i].rootMidi, rh))),
  ]),
};
