import { Song } from '../../types/midi';
import { buildBar, NoteTuple, sortSongNotes } from '../songHelpers';

function gymBar(
  lhPulse: [number, number, 1 | 2 | 3 | 4 | 5, NoteTuple[4]][],
  rhPatterns: [number, number, number, 1 | 2 | 3 | 4 | 5, NoteTuple[4]][]
): NoteTuple[] {
  const lh: NoteTuple[] = lhPulse.map(([off, midi, finger, role]) => [
    off, 0.9, midi, 'L', role, finger, off === 0,
  ]);
  const rh: NoteTuple[] = rhPatterns.map(([off, dur, midi, finger, role]) => [
    off, dur, midi, 'R', role, finger,
  ]);
  return [...lh, ...rh];
}

const PULSE_C: [number, number, 1 | 2 | 3 | 4 | 5, NoteTuple[4]][] = [
  [0, 48, 5, 'root'], [1, 55, 1, 'fifth'], [2, 48, 5, 'root'], [3, 55, 1, 'fifth'],
];

const PULSE_F: [number, number, 1 | 2 | 3 | 4 | 5, NoteTuple[4]][] = [
  [0, 53, 5, 'root'], [1, 60, 1, 'fifth'], [2, 53, 5, 'root'], [3, 60, 1, 'fifth'],
];

const PULSE_G: [number, number, 1 | 2 | 3 | 4 | 5, NoteTuple[4]][] = [
  [0, 55, 5, 'root'], [1, 62, 1, 'fifth'], [2, 55, 5, 'root'], [3, 62, 1, 'fifth'],
];

const BAR_1_THIRDS: NoteTuple[] = gymBar(PULSE_C, [
  [0.0, 0.5, 60, 1, 'root'], [0.5, 0.5, 64, 3, 'third'],
  [1.0, 0.5, 62, 2, 'melody'], [1.5, 0.5, 65, 4, 'melody'],
  [2.0, 0.5, 64, 1, 'third'], [2.5, 0.5, 67, 3, 'fifth'],
  [3.0, 0.5, 65, 2, 'melody'], [3.5, 0.5, 69, 4, 'melody'],
]);

const BAR_2_HIGH: NoteTuple[] = gymBar(PULSE_C, [
  [0.0, 0.5, 67, 1, 'fifth'], [0.5, 0.5, 71, 3, 'seventh'],
  [1.0, 0.5, 69, 2, 'melody'], [1.5, 0.5, 72, 4, 'root'],
  [2.0, 0.5, 71, 3, 'seventh'], [2.5, 0.5, 74, 5, 'melody'],
  [3.0, 1.0, 72, 4, 'root'],
]);

const BAR_3_DESC: NoteTuple[] = gymBar(PULSE_F, [
  [0.0, 0.5, 74, 5, 'melody'], [0.5, 0.5, 71, 3, 'melody'],
  [1.0, 0.5, 72, 4, 'fifth'], [1.5, 0.5, 69, 2, 'third'],
  [2.0, 0.5, 71, 3, 'melody'], [2.5, 0.5, 67, 1, 'melody'],
  [3.0, 0.5, 69, 2, 'third'], [3.5, 0.5, 65, 1, 'root'],
]);

const BAR_4_RES: NoteTuple[] = gymBar(PULSE_C, [
  [0.0, 0.5, 67, 3, 'fifth'], [0.5, 0.5, 64, 1, 'third'],
  [1.0, 0.5, 65, 4, 'melody'], [1.5, 0.5, 62, 2, 'melody'],
  [2.0, 1.0, 64, 3, 'third'], [3.0, 1.0, 60, 1, 'root'],
]);

const BAR_5_HANON_C: NoteTuple[] = gymBar(PULSE_C, [
  [0.0, 0.5, 60, 1, 'root'], [0.5, 0.5, 64, 3, 'third'],
  [1.0, 0.5, 62, 2, 'melody'], [1.5, 0.5, 64, 3, 'third'],
  [2.0, 0.5, 65, 4, 'melody'], [2.5, 0.5, 64, 3, 'third'],
  [3.0, 0.5, 62, 2, 'melody'], [3.5, 0.5, 64, 3, 'third'],
]);

const BAR_6_HANON_F: NoteTuple[] = gymBar(PULSE_F, [
  [0.0, 0.5, 65, 1, 'root'], [0.5, 0.5, 69, 3, 'third'],
  [1.0, 0.5, 67, 2, 'melody'], [1.5, 0.5, 69, 3, 'third'],
  [2.0, 0.5, 71, 4, 'melody'], [2.5, 0.5, 69, 3, 'third'],
  [3.0, 0.5, 67, 2, 'melody'], [3.5, 0.5, 69, 3, 'third'],
]);

const BAR_7_HANON_G: NoteTuple[] = gymBar(PULSE_G, [
  [0.0, 0.5, 67, 1, 'root'], [0.5, 0.5, 71, 3, 'third'],
  [1.0, 0.5, 69, 2, 'melody'], [1.5, 0.5, 71, 3, 'third'],
  [2.0, 0.5, 72, 4, 'melody'], [2.5, 0.5, 71, 3, 'third'],
  [3.0, 0.5, 69, 2, 'melody'], [3.5, 0.5, 71, 3, 'third'],
]);

const BAR_8_FIN: NoteTuple[] = gymBar([[0, 48, 5, 'root']], [
  [0.0, 1.0, 72, 5, 'root'], [1.0, 1.0, 67, 3, 'fifth'],
  [2.0, 1.0, 64, 2, 'third'], [3.0, 1.0, 60, 1, 'root'],
]);

export const lessonFingerGymThirds: Song = {
  id: 'lesson-finger-gym',
  title: 'Lektion 2: Finger Gym — Terser & Hanon',
  bpm: 82,
  timeSignature: [4, 4],
  sections: [
    {
      id: 'gym-part-1',
      name: 'Del 1: Stigande Terser & Hanon',
      startBeat: 0,
      endBeat: 16,
      chords: [
        { beat: 0, symbol: 'C', rootMidi: 48 },
        { beat: 4, symbol: 'C', rootMidi: 48 },
        { beat: 8, symbol: 'F', rootMidi: 53 },
        { beat: 12, symbol: 'C', rootMidi: 48 },
      ],
    },
    {
      id: 'gym-part-2',
      name: 'Del 2: Hanon-Båge',
      startBeat: 16,
      endBeat: 32,
      chords: [
        { beat: 16, symbol: 'C', rootMidi: 48 },
        { beat: 20, symbol: 'F', rootMidi: 53 },
        { beat: 24, symbol: 'G', rootMidi: 55 },
        { beat: 28, symbol: 'C', rootMidi: 48 },
      ],
    },
  ],
  notes: sortSongNotes([
    ...buildBar(0, BAR_1_THIRDS),
    ...buildBar(4, BAR_2_HIGH),
    ...buildBar(8, BAR_3_DESC),
    ...buildBar(12, BAR_4_RES),
    ...buildBar(16, BAR_5_HANON_C),
    ...buildBar(20, BAR_6_HANON_F),
    ...buildBar(24, BAR_7_HANON_G),
    ...buildBar(28, BAR_8_FIN),
  ]),
};
