import { Song } from '../../types/midi';
import { buildBar, NoteTuple, sortSongNotes } from '../songHelpers';

function weaveBar(
  lhNotes: [number, number, number, 1 | 2 | 3 | 4 | 5, NoteTuple[4]][],
  rhNotes: [number, number, number, 1 | 2 | 3 | 4 | 5, NoteTuple[4]][]
): NoteTuple[] {
  const lh: NoteTuple[] = lhNotes.map(([off, dur, midi, finger, role]) => [
    off, dur, midi, 'L', role, finger, off === 0,
  ]);
  const rh: NoteTuple[] = rhNotes.map(([off, dur, midi, finger, role]) => [
    off, dur, midi, 'R', role, finger,
  ]);
  return [...lh, ...rh];
}

const BAR_C_ASC: NoteTuple[] = weaveBar(
  [[0, 2, 48, 5, 'root'], [2, 2, 55, 1, 'fifth']],
  [[0, 1, 60, 1, 'root'], [1, 1, 62, 2, 'melody'], [2, 1, 64, 3, 'third'], [3, 1, 65, 4, 'melody']]
);

const BAR_G_DESC: NoteTuple[] = weaveBar(
  [[0, 2, 55, 1, 'root'], [2, 2, 50, 4, 'fifth']],
  [[0, 1, 67, 5, 'fifth'], [1, 1, 65, 4, 'melody'], [2, 1, 64, 3, 'third'], [3, 1, 62, 2, 'melody']]
);

const BAR_C_ARP: NoteTuple[] = weaveBar(
  [[0, 1, 48, 5, 'root'], [1, 1, 52, 3, 'third'], [2, 2, 55, 1, 'fifth']],
  [[0, 1, 60, 1, 'root'], [1, 1, 64, 3, 'third'], [2, 1, 67, 5, 'fifth'], [3, 1, 64, 3, 'third']]
);

const BAR_G_CAD: NoteTuple[] = weaveBar(
  [[0, 2, 55, 1, 'root'], [2, 2, 50, 4, 'fifth']],
  [[0, 1, 65, 4, 'melody'], [1, 1, 62, 2, 'melody'], [2, 2, 60, 1, 'root']]
);

const BAR_F_CONTRA: NoteTuple[] = weaveBar(
  [[0, 2, 53, 2, 'root'], [2, 2, 48, 5, 'fifth']],
  [[0, 1, 65, 4, 'root'], [1, 1, 64, 3, 'seventh'], [2, 1, 62, 2, 'melody'], [3, 1, 60, 1, 'fifth']]
);

const BAR_C_CONTRA: NoteTuple[] = weaveBar(
  [[0, 2, 52, 3, 'third'], [2, 2, 55, 1, 'fifth']],
  [[0, 1, 64, 3, 'third'], [1, 1, 65, 4, 'melody'], [2, 1, 67, 5, 'fifth'], [3, 1, 64, 3, 'third']]
);

const BAR_G_CONTRA: NoteTuple[] = weaveBar(
  [[0, 2, 50, 4, 'fifth'], [2, 2, 55, 1, 'root']],
  [[0, 1, 62, 2, 'fifth'], [1, 1, 64, 3, 'melody'], [2, 1, 65, 4, 'seventh'], [3, 1, 62, 2, 'fifth']]
);

const BAR_C_FIN: NoteTuple[] = weaveBar(
  [[0, 4, 48, 5, 'root']],
  [[0, 1, 64, 3, 'third'], [1, 1, 62, 2, 'melody'], [2, 2, 60, 1, 'root']]
);

export const lessonFiveFingerWeave: Song = {
  id: 'lesson-five-finger-weave',
  title: 'Lektion 1: 5-Fingers Väv (C-dur)',
  bpm: 80,
  timeSignature: [4, 4],
  sections: [
    {
      id: 'section-weave-1',
      name: 'Del 1: Stigande Väv',
      startBeat: 0,
      endBeat: 16,
      chords: [
        { beat: 0, symbol: 'C', rootMidi: 48 },
        { beat: 4, symbol: 'G', rootMidi: 55 },
        { beat: 8, symbol: 'C', rootMidi: 48 },
        { beat: 12, symbol: 'G', rootMidi: 55 },
      ],
    },
    {
      id: 'section-weave-2',
      name: 'Del 2: Kontrapunktisk Väv',
      startBeat: 16,
      endBeat: 32,
      chords: [
        { beat: 16, symbol: 'F', rootMidi: 53 },
        { beat: 20, symbol: 'C', rootMidi: 48 },
        { beat: 24, symbol: 'G', rootMidi: 55 },
        { beat: 28, symbol: 'C', rootMidi: 48 },
      ],
    },
  ],
  notes: sortSongNotes([
    ...buildBar(0, BAR_C_ASC),
    ...buildBar(4, BAR_G_DESC),
    ...buildBar(8, BAR_C_ARP),
    ...buildBar(12, BAR_G_CAD),
    ...buildBar(16, BAR_F_CONTRA),
    ...buildBar(20, BAR_C_CONTRA),
    ...buildBar(24, BAR_G_CONTRA),
    ...buildBar(28, BAR_C_FIN),
  ]),
};
