import { ChordMarker, Song, SongNote } from '../../types/midi';
import { buildBar, NoteTuple, sortSongNotes } from '../songHelpers';

type ChordName = 'C' | 'G' | 'Am' | 'Em' | 'F';
type Finger = 1 | 2 | 3 | 4 | 5;
type RhSpec = [number, NoteTuple[4], Finger];

const PROGRESSION: { symbol: ChordName; rootMidi: number }[] = [
  { symbol: 'C', rootMidi: 48 },
  { symbol: 'G', rootMidi: 55 },
  { symbol: 'Am', rootMidi: 57 },
  { symbol: 'Em', rootMidi: 52 },
  { symbol: 'F', rootMidi: 53 },
  { symbol: 'C', rootMidi: 48 },
  { symbol: 'F', rootMidi: 53 },
  { symbol: 'G', rootMidi: 55 },
];

function cycleChords(startBeat: number): ChordMarker[] {
  return PROGRESSION.map((c, idx) => ({ beat: startBeat + idx * 2, ...c }));
}

function halfChord(beat: number, rootMidi: number, rh: RhSpec[]): SongNote[] {
  const lh: NoteTuple[] = [[0.0, 1.9, rootMidi, 'L', 'root', 5, true]];
  const stepDur = 2.0 / rh.length;
  const rhTuples: NoteTuple[] = rh.map(([midi, role, finger], i) => [i * stepDur, stepDur, midi, 'R', role, finger]);
  return buildBar(beat, [...lh, ...rhTuples]);
}

function buildCycle(startBeat: number, rhSlices: RhSpec[][]): SongNote[] {
  return rhSlices.flatMap((rh, idx) => halfChord(startBeat + idx * 2, PROGRESSION[idx].rootMidi, rh));
}

const DEL1_HALF_NOTES: RhSpec[][] = [
  [[76, 'third', 5]],
  [[74, 'fifth', 4]],
  [[72, 'third', 3]],
  [[71, 'fifth', 2]],
  [[69, 'third', 2]],
  [[67, 'fifth', 1]],
  [[69, 'third', 2]],
  [[71, 'third', 3]],
];

const DEL1_CANON_LINE: RhSpec[][] = [
  [[72, 'root', 2], [76, 'third', 5]],
  [[71, 'third', 2], [74, 'fifth', 4]],
  [[69, 'root', 1], [72, 'third', 3]],
  [[67, 'third', 1], [71, 'fifth', 4]],
  [[65, 'root', 1], [69, 'third', 3]],
  [[64, 'third', 1], [67, 'fifth', 3]],
  [[65, 'root', 1], [72, 'fifth', 5]],
  [[74, 'fifth', 4], [71, 'third', 2]],
];

const DEL2_EIGHTHS: RhSpec[][] = [
  [[76, 'third', 4], [72, 'root', 2], [74, 'melody', 3], [76, 'third', 4]],
  [[74, 'fifth', 4], [71, 'third', 2], [72, 'melody', 3], [74, 'fifth', 4]],
  [[72, 'third', 3], [69, 'root', 1], [71, 'melody', 2], [72, 'third', 3]],
  [[71, 'fifth', 4], [67, 'third', 1], [69, 'melody', 2], [71, 'fifth', 4]],
  [[69, 'third', 4], [65, 'root', 1], [67, 'melody', 2], [69, 'third', 4]],
  [[67, 'fifth', 4], [64, 'third', 1], [65, 'melody', 2], [67, 'fifth', 4]],
  [[69, 'third', 2], [72, 'fifth', 3], [77, 'root', 5], [76, 'melody', 4]],
  [[74, 'fifth', 4], [71, 'third', 2], [67, 'root', 1], [74, 'fifth', 4]],
];

const DEL2_SIXTEENTHS: RhSpec[][] = [
  [[72, 'root', 1], [76, 'third', 3], [79, 'fifth', 5], [76, 'third', 3], [72, 'root', 1], [74, 'melody', 2], [76, 'third', 3], [72, 'root', 1]],
  [[71, 'third', 1], [74, 'fifth', 3], [79, 'root', 5], [74, 'fifth', 3], [71, 'third', 1], [72, 'melody', 2], [74, 'fifth', 3], [71, 'third', 1]],
  [[69, 'root', 1], [72, 'third', 2], [76, 'fifth', 5], [72, 'third', 2], [69, 'root', 1], [71, 'melody', 2], [72, 'third', 3], [69, 'root', 1]],
  [[67, 'third', 1], [71, 'fifth', 3], [76, 'root', 5], [71, 'fifth', 3], [67, 'third', 1], [69, 'melody', 2], [71, 'fifth', 3], [67, 'third', 1]],
  [[65, 'root', 1], [69, 'third', 3], [72, 'fifth', 5], [69, 'third', 3], [65, 'root', 1], [67, 'melody', 2], [69, 'third', 3], [65, 'root', 1]],
  [[64, 'third', 1], [67, 'fifth', 2], [72, 'root', 5], [67, 'fifth', 2], [64, 'third', 1], [65, 'melody', 2], [67, 'fifth', 3], [64, 'third', 1]],
  [[65, 'root', 1], [69, 'third', 2], [72, 'fifth', 3], [77, 'root', 5], [76, 'melody', 4], [74, 'melody', 3], [72, 'fifth', 2], [69, 'third', 1]],
  [[71, 'third', 1], [74, 'fifth', 2], [79, 'root', 5], [77, 'seventh', 4], [76, 'melody', 3], [74, 'fifth', 2], [72, 'melody', 1], [71, 'third', 1]],
];

export const classicPachelbelCanon: Song = {
  id: 'classic-pachelbel-canon',
  title: 'Klassiker: Pachebels kanon i C-dur',
  bpm: 66,
  timeSignature: [4, 4],
  sections: [
    {
      id: 'pachelbel-part-1',
      name: 'Del 1: Halvnoter & Kanonstämma (Enkel Bas)',
      startBeat: 0,
      endBeat: 32,
      chords: [...cycleChords(0), ...cycleChords(16)],
    },
    {
      id: 'pachelbel-part-2',
      name: 'Del 2: Åttondelar, Sextondelar & Final',
      startBeat: 32,
      endBeat: 69,
      chords: [...cycleChords(32), ...cycleChords(48), { beat: 64, symbol: 'C', rootMidi: 48 }],
    },
  ],
  notes: sortSongNotes([
    ...buildCycle(0, DEL1_HALF_NOTES),
    ...buildCycle(16, DEL1_CANON_LINE),
    ...buildCycle(32, DEL2_EIGHTHS),
    ...buildCycle(48, DEL2_SIXTEENTHS),
    ...buildBar(64, [
      [0.0, 3.0, 48, 'L', 'root', 5, true],
      [0.0, 3.0, 55, 'L', 'fifth', 1],
      [0.0, 3.0, 64, 'R', 'third', 1],
      [0.0, 3.0, 67, 'R', 'fifth', 2],
      [0.0, 3.0, 72, 'R', 'root', 5],
    ]),
  ]),
};
