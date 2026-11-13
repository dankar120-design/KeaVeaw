import { Song } from '../../types/midi';
import { buildBar, NoteTuple, sortSongNotes } from '../songHelpers';

function travisBar(root: number, fifth: number, mel: [number, number, NoteTuple[4], 1|2|3|4|5][]): NoteTuple[] {
  const bass: NoteTuple[] = [
    [0, 0.5, root, 'L', 'root', 5, true],
    [0.5, 0.5, fifth, 'L', 'fifth', 2],
    [1.0, 0.5, root, 'L', 'root', 5],
    [1.5, 0.5, fifth, 'L', 'fifth', 2],
    [2.0, 0.5, root, 'L', 'root', 5],
    [2.5, 0.5, fifth, 'L', 'fifth', 2],
    [3.0, 0.5, root, 'L', 'root', 5],
    [3.5, 0.5, fifth, 'L', 'fifth', 2],
  ];
  const top: NoteTuple[] = mel.map(([off, midi, role, finger]) => [off, 0.75, midi, 'R', role, finger]);
  return [...bass, ...top];
}

const AM: [number, number, NoteTuple[4], 1|2|3|4|5][] = [
  [0, 72, 'third', 3], [1.5, 76, 'fifth', 5], [2.5, 71, 'melody', 2], [3.5, 72, 'third', 3],
];
const F_MAJ: [number, number, NoteTuple[4], 1|2|3|4|5][] = [
  [0, 69, 'third', 2], [1.5, 72, 'fifth', 4], [2.5, 74, 'melody', 5], [3.5, 72, 'fifth', 4],
];
const C_MAJ: [number, number, NoteTuple[4], 1|2|3|4|5][] = [
  [0, 76, 'third', 4], [1.5, 72, 'root', 2], [2.5, 74, 'melody', 3], [3.5, 76, 'third', 4],
];
const G_MAJ: [number, number, NoteTuple[4], 1|2|3|4|5][] = [
  [0, 74, 'fifth', 3], [1.5, 79, 'root', 5], [2.5, 76, 'melody', 4], [3.5, 74, 'fifth', 3],
];
const AM_HIGH: [number, number, NoteTuple[4], 1|2|3|4|5][] = [
  [0, 76, 'fifth', 4], [1.5, 79, 'seventh', 5], [2.5, 76, 'fifth', 4], [3.5, 72, 'third', 2],
];

export const nordicEmbers: Song = {
  id: 'nordic-embers',
  title: 'Nordic Embers (Am - F - C - G Weave)',
  bpm: 92,
  timeSignature: [4, 4],
  sections: [
    {
      id: 'verse-a',
      name: 'Del 1: Travis Weave',
      startBeat: 0,
      endBeat: 16,
      chords: [
        { beat: 0, symbol: 'Am', rootMidi: 57 },
        { beat: 4, symbol: 'F', rootMidi: 53 },
        { beat: 8, symbol: 'C', rootMidi: 60 },
        { beat: 12, symbol: 'G', rootMidi: 55 },
      ],
    },
    {
      id: 'verse-b',
      name: 'Del 2: Lyft Melodi',
      startBeat: 16,
      endBeat: 32,
      chords: [
        { beat: 16, symbol: 'Am', rootMidi: 57 },
        { beat: 20, symbol: 'F', rootMidi: 53 },
        { beat: 24, symbol: 'C', rootMidi: 60 },
        { beat: 28, symbol: 'G', rootMidi: 55 },
      ],
    },
  ],
  notes: sortSongNotes([
    ...buildBar(0, travisBar(57, 64, AM)),
    ...buildBar(4, travisBar(53, 60, F_MAJ)),
    ...buildBar(8, travisBar(60, 67, C_MAJ)),
    ...buildBar(12, travisBar(55, 62, G_MAJ)),
    ...buildBar(16, travisBar(57, 64, AM_HIGH)),
    ...buildBar(20, travisBar(53, 60, F_MAJ)),
    ...buildBar(24, travisBar(60, 67, C_MAJ)),
    ...buildBar(28, travisBar(55, 62, G_MAJ)),
  ]),
};
