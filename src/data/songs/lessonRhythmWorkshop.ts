import { Song } from '../../types/midi';
import { buildBar, NoteTuple, sortSongNotes } from '../songHelpers';

function rhythmBar(
  lhPulse: [number, number, 1 | 2 | 3 | 4 | 5, NoteTuple[4]][],
  rhMelody: [number, number, number, 1 | 2 | 3 | 4 | 5, NoteTuple[4]][]
): NoteTuple[] {
  const lh: NoteTuple[] = lhPulse.map(([off, midi, finger, role]) => [
    off, 0.85, midi, 'L', role, finger, off === 0,
  ]);
  const rh: NoteTuple[] = rhMelody.map(([off, dur, midi, finger, role]) => [
    off, dur, midi, 'R', role, finger,
  ]);
  return [...lh, ...rh];
}

const LH_C: [number, number, 1 | 2 | 3 | 4 | 5, NoteTuple[4]][] = [
  [0, 48, 5, 'root'], [1, 55, 1, 'fifth'], [2, 48, 5, 'root'], [3, 55, 1, 'fifth'],
];
const LH_AM: [number, number, 1 | 2 | 3 | 4 | 5, NoteTuple[4]][] = [
  [0, 57, 5, 'root'], [1, 52, 1, 'fifth'], [2, 57, 5, 'root'], [3, 52, 1, 'fifth'],
];
const LH_F: [number, number, 1 | 2 | 3 | 4 | 5, NoteTuple[4]][] = [
  [0, 53, 5, 'root'], [1, 48, 1, 'fifth'], [2, 53, 5, 'root'], [3, 48, 1, 'fifth'],
];
const LH_G: [number, number, 1 | 2 | 3 | 4 | 5, NoteTuple[4]][] = [
  [0, 55, 5, 'root'], [1, 50, 1, 'fifth'], [2, 55, 5, 'root'], [3, 50, 1, 'fifth'],
];

const BAR_1: NoteTuple[] = rhythmBar(LH_C, [
  [0.0, 1.0, 60, 1, 'root'],
  [1.0, 1.0, 64, 3, 'third'],
  [2.0, 0.5, 67, 5, 'fifth'], [2.5, 0.5, 65, 4, 'melody'],
  [3.0, 0.5, 64, 3, 'third'], [3.5, 0.5, 62, 2, 'melody'],
]);

const BAR_2: NoteTuple[] = rhythmBar(LH_AM, [
  [0.0, 0.5, 60, 1, 'third'], [0.5, 0.5, 62, 2, 'melody'],
  [1.0, 1.0, 64, 3, 'fifth'],
  [2.0, 1.0, 69, 5, 'root'],
  [3.0, 0.5, 67, 4, 'seventh'], [3.5, 0.5, 64, 3, 'fifth'],
]);

const BAR_3: NoteTuple[] = rhythmBar(LH_F, [
  [0.0, 1.0, 65, 1, 'root'],
  [1.0, 0.5, 69, 3, 'third'], [1.5, 0.5, 72, 5, 'fifth'],
  [2.0, 1.0, 69, 3, 'third'],
  [3.0, 0.5, 65, 1, 'root'], [3.5, 0.5, 67, 2, 'melody'],
]);

const BAR_4: NoteTuple[] = rhythmBar(LH_G, [
  [0.0, 0.5, 71, 3, 'third'], [0.5, 0.5, 72, 4, 'melody'],
  [1.0, 1.0, 74, 5, 'fifth'],
  [2.0, 1.0, 67, 1, 'root'],
  [3.0, 1.0, 79, 5, 'root'],
]);

const BAR_5: NoteTuple[] = rhythmBar(LH_C, [
  [0.0, 0.5, 67, 3, 'fifth'], [0.5, 0.5, 69, 4, 'melody'],
  [1.0, 0.5, 67, 3, 'fifth'], [1.5, 0.5, 64, 2, 'third'],
  [2.0, 1.0, 60, 1, 'root'],
  [3.0, 1.0, 64, 2, 'third'],
]);

const BAR_6: NoteTuple[] = rhythmBar(LH_AM, [
  [0.0, 1.0, 69, 5, 'root'],
  [1.0, 0.5, 64, 2, 'fifth'], [1.5, 0.5, 62, 1, 'melody'],
  [2.0, 1.0, 60, 1, 'third'],
  [3.0, 1.0, 64, 2, 'fifth'],
]);

const BAR_7: NoteTuple[] = rhythmBar(LH_F, [
  [0.0, 0.5, 72, 5, 'fifth'], [0.5, 0.5, 69, 3, 'third'],
  [1.0, 1.0, 65, 1, 'root'],
  [2.0, 0.5, 69, 3, 'third'], [2.5, 0.5, 72, 5, 'fifth'],
  [3.0, 1.0, 74, 5, 'melody'],
]);

const BAR_8: NoteTuple[] = rhythmBar(LH_G, [
  [0.0, 1.0, 71, 3, 'third'],
  [1.0, 0.5, 74, 4, 'fifth'], [1.5, 0.5, 71, 3, 'third'],
  [2.0, 1.0, 72, 5, 'melody'],
  [3.0, 1.0, 60, 1, 'melody'],
]);

export const lessonRhythmWorkshop: Song = {
  id: 'lesson-rhythm-workshop',
  title: 'Lektion 3: Rytmverkstad — Kvart & Åttondel',
  bpm: 78,
  timeSignature: [4, 4],
  sections: [
    {
      id: 'rhythm-part-1',
      name: 'Del 1: Kvart Möter Åttondel',
      startBeat: 0,
      endBeat: 16,
      chords: [
        { beat: 0, symbol: 'C', rootMidi: 48 },
        { beat: 4, symbol: 'Am', rootMidi: 57 },
        { beat: 8, symbol: 'F', rootMidi: 53 },
        { beat: 12, symbol: 'G', rootMidi: 55 },
      ],
    },
    {
      id: 'rhythm-part-2',
      name: 'Del 2: Rytmisk Dialog',
      startBeat: 16,
      endBeat: 32,
      chords: [
        { beat: 16, symbol: 'C', rootMidi: 48 },
        { beat: 20, symbol: 'Am', rootMidi: 57 },
        { beat: 24, symbol: 'F', rootMidi: 53 },
        { beat: 28, symbol: 'G', rootMidi: 55 },
      ],
    },
  ],
  notes: sortSongNotes([
    ...buildBar(0, BAR_1),
    ...buildBar(4, BAR_2),
    ...buildBar(8, BAR_3),
    ...buildBar(12, BAR_4),
    ...buildBar(16, BAR_5),
    ...buildBar(20, BAR_6),
    ...buildBar(24, BAR_7),
    ...buildBar(28, BAR_8),
  ]),
};
