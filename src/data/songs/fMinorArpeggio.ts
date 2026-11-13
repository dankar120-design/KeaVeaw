import { Song } from '../../types/midi';
import { buildBar, NoteTuple, sortSongNotes } from '../songHelpers';

function arp68(m1: number, m2: number, m3: number, m4: number, m5: number, m6: number): NoteTuple[] {
  return [
    [0, 0.5, m1, 'L', 'root', 5, true],
    [0.5, 0.5, m2, 'L', 'fifth', 2],
    [1.0, 0.5, m3, 'L', 'third', 1],
    [1.5, 0.5, m4, 'R', 'fifth', 2],
    [2.0, 0.5, m5, 'R', 'root', 5],
    [2.5, 0.5, m6, 'R', 'fifth', 2],
  ];
}

export const fMinorArpeggio: Song = {
  id: 'f-minor-arpeggio',
  title: 'F-Minor 6/8 Arpeggio Ballad',
  bpm: 72,
  timeSignature: [6, 8],
  sections: [
    {
      id: 'intro',
      name: 'Del 1: Öppen F-moll',
      startBeat: 0,
      endBeat: 12,
      chords: [
        { beat: 0, symbol: 'Fm', rootMidi: 53 },
        { beat: 3, symbol: 'Db', rootMidi: 61 },
        { beat: 6, symbol: 'Eb', rootMidi: 63 },
        { beat: 9, symbol: 'Cm', rootMidi: 60 },
      ],
    },
    {
      id: 'climax',
      name: 'Del 2: Toppklättring',
      startBeat: 12,
      endBeat: 24,
      chords: [
        { beat: 12, symbol: 'Fm', rootMidi: 53 },
        { beat: 15, symbol: 'Db', rootMidi: 61 },
        { beat: 18, symbol: 'Eb', rootMidi: 63 },
        { beat: 21, symbol: 'Fm', rootMidi: 53 },
      ],
    },
  ],
  notes: sortSongNotes([
    ...buildBar(0, arp68(53, 60, 68, 72, 77, 72)),
    ...buildBar(3, arp68(61, 68, 73, 77, 80, 77)),
    ...buildBar(6, arp68(63, 70, 75, 79, 82, 79)),
    ...buildBar(9, arp68(55, 60, 67, 72, 75, 72)),
    ...buildBar(12, arp68(53, 60, 68, 77, 84, 77)),
    ...buildBar(15, arp68(61, 68, 73, 80, 84, 80)),
    ...buildBar(18, arp68(63, 70, 75, 79, 82, 79)),
    ...buildBar(21, arp68(53, 60, 68, 72, 77, 72)),
  ]),
};
