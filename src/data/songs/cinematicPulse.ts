import { Song } from '../../types/midi';
import { buildBar, NoteTuple, sortSongNotes } from '../songHelpers';

function pulseBar(bass: number, inner: number, third: number, ostinato: number, peak: number): NoteTuple[] {
  return [
    [0, 1.0, bass, 'L', 'root', 5, true],
    [0, 0.5, ostinato, 'R', 'melody', 3],
    [0.5, 0.5, inner, 'L', 'fifth', 2],
    [1.0, 0.5, third, 'L', 'third', 1],
    [1.0, 0.5, peak, 'R', 'melody', 5],
    [1.5, 0.5, inner, 'L', 'fifth', 2],
    [2.0, 1.0, bass, 'L', 'root', 5],
    [2.0, 0.5, ostinato, 'R', 'melody', 3],
    [2.5, 0.5, inner, 'L', 'fifth', 2],
    [3.0, 0.5, third, 'L', 'third', 1],
    [3.0, 0.5, peak, 'R', 'melody', 5],
    [3.5, 0.5, inner, 'L', 'fifth', 2],
  ];
}

export const cinematicPulse: Song = {
  id: 'cinematic-pulse',
  title: 'Cinematic Post-Rock Pulse (Dm - Bb - F - C)',
  bpm: 104,
  timeSignature: [4, 4],
  sections: [
    {
      id: 'pulse-1',
      name: 'Del 1: Ostinato Puls',
      startBeat: 0,
      endBeat: 16,
      chords: [
        { beat: 0, symbol: 'Dm', rootMidi: 62 },
        { beat: 4, symbol: 'Bb', rootMidi: 58 },
        { beat: 8, symbol: 'F', rootMidi: 53 },
        { beat: 12, symbol: 'C', rootMidi: 60 },
      ],
    },
    {
      id: 'pulse-2',
      name: 'Del 2: Oktavlyft',
      startBeat: 16,
      endBeat: 32,
      chords: [
        { beat: 16, symbol: 'Dm', rootMidi: 62 },
        { beat: 20, symbol: 'Bb', rootMidi: 58 },
        { beat: 24, symbol: 'F', rootMidi: 53 },
        { beat: 28, symbol: 'C', rootMidi: 60 },
      ],
    },
  ],
  notes: sortSongNotes([
    ...buildBar(0, pulseBar(62, 69, 65, 77, 81)),
    ...buildBar(4, pulseBar(58, 65, 70, 77, 82)),
    ...buildBar(8, pulseBar(53, 60, 69, 77, 81)),
    ...buildBar(12, pulseBar(55, 60, 64, 79, 84)),
    ...buildBar(16, pulseBar(62, 69, 74, 81, 84)),
    ...buildBar(20, pulseBar(58, 65, 74, 82, 84)),
    ...buildBar(24, pulseBar(53, 60, 69, 77, 81)),
    ...buildBar(28, pulseBar(55, 60, 67, 79, 84)),
  ]),
};
