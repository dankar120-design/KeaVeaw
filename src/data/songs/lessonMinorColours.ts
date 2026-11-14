import { Song } from '../../types/midi';
import { buildBar, NoteTuple, sortSongNotes } from '../songHelpers';

function andalusianBar(
  lhRoot: number,
  lhFifth: number,
  rhMelody: [number, number, number, 1 | 2 | 3 | 4 | 5, NoteTuple[4]][]
): NoteTuple[] {
  const lh: NoteTuple[] = [
    [0.0, 2.0, lhRoot, 'L', 'root', 5, true],
    [2.0, 2.0, lhFifth, 'L', 'fifth', 1],
  ];
  const rh: NoteTuple[] = rhMelody.map(([off, dur, midi, finger, role]) => [
    off, dur, midi, 'R', role, finger,
  ]);
  return [...lh, ...rh];
}

const BAR_1_SCALE: NoteTuple[] = andalusianBar(57, 64, [
  [0.0, 1.0, 69, 1, 'root'],
  [1.0, 1.0, 71, 2, 'melody'],
  [2.0, 1.0, 72, 3, 'third'],
  [3.0, 1.0, 74, 4, 'melody'],
]);

const BAR_2_SCALE: NoteTuple[] = andalusianBar(55, 62, [
  [0.0, 1.0, 74, 4, 'fifth'],
  [1.0, 1.0, 72, 3, 'melody'],
  [2.0, 1.0, 71, 2, 'third'],
  [3.0, 1.0, 69, 1, 'melody'],
]);

const BAR_3_SCALE: NoteTuple[] = andalusianBar(53, 60, [
  [0.0, 1.0, 71, 1, 'melody'],
  [1.0, 1.0, 72, 2, 'fifth'],
  [2.0, 1.0, 74, 3, 'melody'],
  [3.0, 1.0, 76, 4, 'seventh'],
]);

const BAR_4_CADENCE_E: NoteTuple[] = andalusianBar(52, 59, [
  [0.0, 1.0, 74, 3, 'seventh'],
  [1.0, 1.0, 71, 2, 'fifth'],
  [2.0, 2.0, 68, 1, 'third'],
]);

const BAR_5_FLOURISH_AM: NoteTuple[] = andalusianBar(57, 64, [
  [0.0, 0.5, 69, 1, 'root'], [0.5, 0.5, 72, 3, 'third'],
  [1.0, 1.0, 76, 5, 'fifth'],
  [2.0, 1.0, 72, 3, 'third'],
  [3.0, 1.0, 69, 1, 'root'],
]);

const BAR_6_FLOURISH_G: NoteTuple[] = andalusianBar(55, 62, [
  [0.0, 0.5, 67, 1, 'root'], [0.5, 0.5, 71, 3, 'third'],
  [1.0, 1.0, 74, 5, 'fifth'],
  [2.0, 1.0, 71, 3, 'third'],
  [3.0, 1.0, 67, 1, 'root'],
]);

const BAR_7_FLOURISH_F: NoteTuple[] = andalusianBar(53, 60, [
  [0.0, 0.5, 65, 1, 'root'], [0.5, 0.5, 69, 3, 'third'],
  [1.0, 1.0, 72, 5, 'fifth'],
  [2.0, 1.0, 69, 3, 'third'],
  [3.0, 1.0, 65, 1, 'root'],
]);

const BAR_8_FLOURISH_E: NoteTuple[] = andalusianBar(52, 59, [
  [0.0, 0.5, 64, 1, 'root'], [0.5, 0.5, 68, 2, 'third'],
  [1.0, 1.0, 71, 4, 'fifth'],
  [2.0, 1.0, 68, 2, 'third'],
  [3.0, 1.0, 64, 1, 'root'],
]);

export const lessonMinorColours: Song = {
  id: 'lesson-minor-colours',
  title: 'Lektion 5: A-Moll & Andalusisk Kadens',
  bpm: 84,
  timeSignature: [4, 4],
  sections: [
    {
      id: 'minor-part-1',
      name: 'Del 1: A-Moll Skallöpning (A4–E5)',
      startBeat: 0,
      endBeat: 16,
      chords: [
        { beat: 0, symbol: 'Am', rootMidi: 57 },
        { beat: 4, symbol: 'G', rootMidi: 55 },
        { beat: 8, symbol: 'F', rootMidi: 53 },
        { beat: 12, symbol: 'E', rootMidi: 52 },
      ],
    },
    {
      id: 'minor-part-2',
      name: 'Del 2: Andalusisk Kadens & Kadenslyft',
      startBeat: 16,
      endBeat: 32,
      chords: [
        { beat: 16, symbol: 'Am', rootMidi: 57 },
        { beat: 20, symbol: 'G', rootMidi: 55 },
        { beat: 24, symbol: 'F', rootMidi: 53 },
        { beat: 28, symbol: 'E', rootMidi: 52 },
      ],
    },
  ],
  notes: sortSongNotes([
    ...buildBar(0, BAR_1_SCALE),
    ...buildBar(4, BAR_2_SCALE),
    ...buildBar(8, BAR_3_SCALE),
    ...buildBar(12, BAR_4_CADENCE_E),
    ...buildBar(16, BAR_5_FLOURISH_AM),
    ...buildBar(20, BAR_6_FLOURISH_G),
    ...buildBar(24, BAR_7_FLOURISH_F),
    ...buildBar(28, BAR_8_FLOURISH_E),
  ]),
};
