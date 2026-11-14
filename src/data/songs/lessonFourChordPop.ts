import { Song } from '../../types/midi';
import { buildBar, NoteTuple, sortSongNotes } from '../songHelpers';

function popCompBar(
  lhRoot: number,
  lhFifth: number,
  rhTriad: [number, number, number]
): NoteTuple[] {
  const [low, mid, high] = rhTriad;
  return [
    [0.0, 1.0, lhRoot, 'L', 'root', 5, true],
    [1.0, 1.0, lhFifth, 'L', 'fifth', 1],
    [2.0, 1.0, lhRoot, 'L', 'root', 5],
    [3.0, 1.0, lhFifth, 'L', 'fifth', 1],
    [0.0, 1.5, low, 'R', 'fifth', 1, true],
    [0.0, 1.5, mid, 'R', 'root', 3, true],
    [0.0, 1.5, high, 'R', 'third', 5, true],
    [1.5, 1.0, low, 'R', 'fifth', 1],
    [1.5, 1.0, mid, 'R', 'root', 3],
    [1.5, 1.0, high, 'R', 'third', 5],
    [2.5, 1.5, low, 'R', 'fifth', 1],
    [2.5, 1.5, mid, 'R', 'root', 3],
    [2.5, 1.5, high, 'R', 'third', 5],
  ];
}

function popArpBar(
  lhRoot: number,
  lhFifth: number,
  rhTriad: [number, number, number]
): NoteTuple[] {
  const [low, mid, high] = rhTriad;
  return [
    [0.0, 1.0, lhRoot, 'L', 'root', 5, true],
    [1.0, 1.0, lhFifth, 'L', 'fifth', 1],
    [2.0, 1.0, lhRoot, 'L', 'root', 5],
    [3.0, 1.0, lhFifth, 'L', 'fifth', 1],
    [0.0, 0.5, low, 'R', 'fifth', 1, true],
    [0.5, 0.5, mid, 'R', 'root', 3],
    [1.0, 1.0, high, 'R', 'third', 5],
    [2.0, 0.5, mid, 'R', 'root', 3],
    [2.5, 0.5, high, 'R', 'third', 5],
    [3.0, 1.0, mid, 'R', 'root', 3],
  ];
}

const TRIAD_C: [number, number, number] = [67, 72, 76];
const TRIAD_G: [number, number, number] = [67, 71, 74];
const TRIAD_AM: [number, number, number] = [69, 72, 76];
const TRIAD_F: [number, number, number] = [69, 72, 77];

export const lessonFourChordPop: Song = {
  id: 'lesson-four-chord-pop',
  title: 'Lektion 4: 4-Ackordsloop (C – G – Am – F)',
  bpm: 88,
  timeSignature: [4, 4],
  sections: [
    {
      id: 'pop-part-1',
      name: 'Del 1: Smidig Ackordsväv (I-V-vi-IV)',
      startBeat: 0,
      endBeat: 16,
      chords: [
        { beat: 0, symbol: 'C', rootMidi: 48 },
        { beat: 4, symbol: 'G', rootMidi: 55 },
        { beat: 8, symbol: 'Am', rootMidi: 57 },
        { beat: 12, symbol: 'F', rootMidi: 53 },
      ],
    },
    {
      id: 'pop-part-2',
      name: 'Del 2: Rullande Pop-Mönster',
      startBeat: 16,
      endBeat: 32,
      chords: [
        { beat: 16, symbol: 'C', rootMidi: 48 },
        { beat: 20, symbol: 'G', rootMidi: 55 },
        { beat: 24, symbol: 'Am', rootMidi: 57 },
        { beat: 28, symbol: 'F', rootMidi: 53 },
      ],
    },
  ],
  notes: sortSongNotes([
    ...buildBar(0, popCompBar(48, 55, TRIAD_C)),
    ...buildBar(4, popCompBar(55, 62, TRIAD_G)),
    ...buildBar(8, popCompBar(57, 64, TRIAD_AM)),
    ...buildBar(12, popCompBar(53, 60, TRIAD_F)),
    ...buildBar(16, popArpBar(48, 55, TRIAD_C)),
    ...buildBar(20, popArpBar(55, 62, TRIAD_G)),
    ...buildBar(24, popArpBar(57, 64, TRIAD_AM)),
    ...buildBar(28, popArpBar(53, 60, TRIAD_F)),
  ]),
};
