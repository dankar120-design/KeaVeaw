import { Song } from '../../types/midi';
import { buildBar, NoteTuple, sortSongNotes } from '../songHelpers';

const LH_AM: [number, number, number] = [57, 60, 64];
const LH_E: [number, number, number] = [52, 59, 64];
const LH_C: [number, number, number] = [48, 55, 60];
const LH_G: [number, number, number] = [55, 59, 62];

function eliseMotifBar(): NoteTuple[] {
  return [
    [0.0, 0.5, 76, 'R', 'fifth', 5],
    [0.5, 0.5, 75, 'R', 'melody', 4],
    [1.0, 0.5, 76, 'R', 'fifth', 5],
    [1.5, 0.5, 71, 'R', 'melody', 2],
    [2.0, 0.5, 74, 'R', 'melody', 4],
    [2.5, 0.5, 72, 'R', 'third', 3],
  ];
}

function eliseAnsBar(
  lh: [number, number, number],
  topMidi: number,
  topRole: NoteTuple[4],
  tail: [number, NoteTuple[4], 1 | 2 | 3 | 4 | 5][]
): NoteTuple[] {
  const lhNotes: NoteTuple[] = [
    [0.0, 0.5, lh[0], 'L', 'root', 5, true],
    [0.5, 0.5, lh[1], 'L', 'third', 3],
    [1.0, 0.5, lh[2], 'L', 'fifth', 1],
  ];
  const rhHead: NoteTuple = [0.0, 1.5, topMidi, 'R', topRole, 5];
  const rhTail: NoteTuple[] = tail.map(([m, role, f], i) => [1.5 + i * 0.5, 0.5, m, 'R', role, f]);
  return [...lhNotes, rhHead, ...rhTail];
}

export const classicFurElise: Song = {
  id: 'classic-fur-elise',
  title: 'Klassiker: Für Elise (Tema)',
  bpm: 80,
  timeSignature: [3, 4],
  sections: [
    {
      id: 'fur-elise-part-1',
      name: 'Del 1: Huvudtema (Am – E)',
      startBeat: 0,
      endBeat: 27,
      chords: [
        { beat: 0, symbol: 'Am', rootMidi: 57 },
        { beat: 9, symbol: 'E', rootMidi: 52 },
        { beat: 12, symbol: 'Am', rootMidi: 57 },
        { beat: 21, symbol: 'E', rootMidi: 52 },
        { beat: 24, symbol: 'Am', rootMidi: 57 },
      ],
    },
    {
      id: 'fur-elise-part-2',
      name: 'Del 2: Mellanspel (C – G – Am – E)',
      startBeat: 27,
      endBeat: 39,
      chords: [
        { beat: 27, symbol: 'C', rootMidi: 48 },
        { beat: 30, symbol: 'G', rootMidi: 55 },
        { beat: 33, symbol: 'Am', rootMidi: 57 },
        { beat: 36, symbol: 'E', rootMidi: 52 },
      ],
    },
    {
      id: 'fur-elise-part-3',
      name: 'Del 3: A-återgång (Am – E – Am)',
      startBeat: 39,
      endBeat: 53,
      chords: [
        { beat: 39, symbol: 'Am', rootMidi: 57 },
        { beat: 42, symbol: 'Am', rootMidi: 57 },
        { beat: 45, symbol: 'E', rootMidi: 52 },
        { beat: 48, symbol: 'Am', rootMidi: 57 },
      ],
    },
  ],
  notes: sortSongNotes([
    ...buildBar(0, [[2.0, 0.5, 76, 'R', 'fifth', 5], [2.5, 0.5, 75, 'R', 'melody', 4]]),
    ...buildBar(3, eliseMotifBar()),
    ...buildBar(6, eliseAnsBar(LH_AM, 69, 'root', [[60, 'third', 1], [64, 'fifth', 2], [69, 'root', 4]])),
    ...buildBar(9, eliseAnsBar(LH_E, 71, 'fifth', [[64, 'root', 1], [68, 'third', 3], [71, 'fifth', 5]])),
    ...buildBar(12, eliseAnsBar(LH_AM, 72, 'third', [[64, 'fifth', 1], [76, 'fifth', 5], [75, 'melody', 4]])),
    ...buildBar(15, eliseMotifBar()),
    ...buildBar(18, eliseAnsBar(LH_AM, 69, 'root', [[60, 'third', 1], [64, 'fifth', 2], [69, 'root', 4]])),
    ...buildBar(21, eliseAnsBar(LH_E, 71, 'fifth', [[64, 'root', 1], [72, 'melody', 5], [71, 'fifth', 4]])),
    ...buildBar(24, eliseAnsBar(LH_AM, 69, 'root', [[71, 'melody', 2], [72, 'third', 3], [74, 'melody', 4]])),
    ...buildBar(27, eliseAnsBar(LH_C, 76, 'third', [[67, 'fifth', 1], [77, 'melody', 5], [76, 'third', 4]])),
    ...buildBar(30, eliseAnsBar(LH_G, 74, 'fifth', [[65, 'seventh', 1], [76, 'melody', 5], [74, 'fifth', 4]])),
    ...buildBar(33, eliseAnsBar(LH_AM, 72, 'third', [[64, 'fifth', 1], [74, 'melody', 4], [72, 'third', 3]])),
    ...buildBar(36, eliseAnsBar(LH_E, 71, 'fifth', [[64, 'root', 1], [76, 'root', 5], [75, 'melody', 4]])),
    ...buildBar(39, eliseMotifBar()),
    ...buildBar(42, eliseAnsBar(LH_AM, 69, 'root', [[60, 'third', 1], [64, 'fifth', 2], [69, 'root', 4]])),
    ...buildBar(45, eliseAnsBar(LH_E, 71, 'fifth', [[64, 'root', 1], [72, 'melody', 5], [71, 'fifth', 4]])),
    ...buildBar(48, [
      [0.0, 3.0, 57, 'L', 'root', 5, true],
      [0.0, 3.0, 64, 'L', 'fifth', 1],
      [0.0, 3.0, 69, 'R', 'root', 2],
    ]),
  ]),
};
