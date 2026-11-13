import { describe, it, expect } from 'vitest';
import { SONGS } from '../index';
import { cinematicPulse } from '../cinematicPulse';
import { chordRootPitchClass, intervalLabel } from '../../../utils/musicTheory';

describe('Built-in songs chord rootMidi integrity (#7)', () => {
  it('matches ChordMarker.rootMidi pitch class to chordRootPitchClass across all songs', () => {
    expect(chordRootPitchClass('Bb')).toBe(10);
    expect(chordRootPitchClass('F#m7')).toBe(6);
    expect(chordRootPitchClass('invalid')).toBeNull();

    for (const song of SONGS) {
      for (const sec of song.sections) {
        for (const chord of sec.chords) {
          const actualPc = ((chord.rootMidi % 12) + 12) % 12;
          expect(actualPc, `${song.id} beat ${chord.beat} (${chord.symbol})`).toBe(chordRootPitchClass(chord.symbol));
        }
      }
    }
  });

  it('displays intervals 1, 3, 5 for C4, E4, G3 on C bars in Cinematic Pulse', () => {
    const cChords = cinematicPulse.sections.flatMap((s) => s.chords).filter((c) => c.symbol === 'C');
    expect(cChords.map((c) => c.beat)).toEqual([12, 28]);
    for (const c of cChords) {
      expect(intervalLabel(60, c.rootMidi)).toBe('1');
      expect(intervalLabel(64, c.rootMidi)).toBe('3');
      expect(intervalLabel(55, c.rootMidi)).toBe('5');
    }
  });
});
