import { Song } from '../../types/midi';
import { buildBar, NoteTuple, sortSongNotes } from '../songHelpers';

function shuffleBar(root: number, third: number, seventh: number, licks: [number, number, 1|2|3|4|5][]): NoteTuple[] {
  const comp: NoteTuple[] = [
    [0, 1.0, root, 'L', 'root', 5, true],
    [0, 0.75, seventh, 'L', 'seventh', 1],
    [1.5, 0.5, third, 'L', 'third', 3],
    [2.0, 1.0, root, 'L', 'root', 5],
    [2.0, 0.75, seventh, 'L', 'seventh', 1],
    [3.5, 0.5, third, 'L', 'third', 3],
  ];
  const lead: NoteTuple[] = licks.map(([off, midi, finger]) => [off, 0.5, midi, 'R', 'melody', finger]);
  return [...comp, ...lead];
}

const LICK_A: [number, number, 1|2|3|4|5][] = [[0.5, 72, 2], [1.0, 74, 3], [2.5, 75, 4], [3.0, 76, 5]];
const LICK_D: [number, number, 1|2|3|4|5][] = [[0.5, 76, 3], [1.0, 74, 2], [2.5, 72, 1], [3.0, 74, 2]];
const LICK_E: [number, number, 1|2|3|4|5][] = [[0.5, 79, 4], [1.0, 81, 5], [2.5, 79, 4], [3.0, 76, 2]];

export const bluesShuffle: Song = {
  id: 'blues-shuffle',
  title: 'Blues/Rock Shuffle Compact (A7 - D7 - E7)',
  bpm: 108,
  timeSignature: [4, 4],
  sections: [
    {
      id: 'blues-a',
      name: 'Del 1: A7 - D7 Shell',
      startBeat: 0,
      endBeat: 16,
      chords: [
        { beat: 0, symbol: 'A7', rootMidi: 57 },
        { beat: 4, symbol: 'D7', rootMidi: 62 },
        { beat: 8, symbol: 'A7', rootMidi: 57 },
        { beat: 12, symbol: 'A7', rootMidi: 57 },
      ],
    },
    {
      id: 'blues-b',
      name: 'Del 2: Turnaround',
      startBeat: 16,
      endBeat: 32,
      chords: [
        { beat: 16, symbol: 'D7', rootMidi: 62 },
        { beat: 20, symbol: 'D7', rootMidi: 62 },
        { beat: 24, symbol: 'E7', rootMidi: 64 },
        { beat: 28, symbol: 'A7', rootMidi: 57 },
      ],
    },
  ],
  notes: sortSongNotes([
    ...buildBar(0, shuffleBar(57, 61, 67, LICK_A)),
    ...buildBar(4, shuffleBar(62, 66, 72, LICK_D)),
    ...buildBar(8, shuffleBar(57, 61, 67, LICK_A)),
    ...buildBar(12, shuffleBar(57, 61, 67, LICK_E)),
    ...buildBar(16, shuffleBar(62, 66, 72, LICK_D)),
    ...buildBar(20, shuffleBar(62, 66, 72, LICK_D)),
    ...buildBar(24, shuffleBar(64, 68, 74, LICK_E)),
    ...buildBar(28, shuffleBar(57, 61, 67, LICK_A)),
  ]),
};
