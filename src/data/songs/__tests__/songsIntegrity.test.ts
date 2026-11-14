import { describe, it, expect } from 'vitest';
import { SONGS, CLASSIC_SONGS, LESSON_SONGS } from '../index';
import { cinematicPulse } from '../cinematicPulse';
import { chordRootPitchClass, intervalLabel } from '../../../utils/musicTheory';
import { MIDI_MAX, MIDI_MIN } from '../../../types/midi';

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

  it('has unique song ids across all SONGS', () => {
    expect(SONGS.length).toBe(CLASSIC_SONGS.length + LESSON_SONGS.length);
    const ids = SONGS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('enforces valid Keystation 32 note bounds, positive durations, and valid fingering', () => {
    for (const song of SONGS) {
      expect(song.notes.length, `${song.id} should have notes`).toBeGreaterThan(0);
      for (const note of song.notes) {
        expect(note.midi, `${song.id} note at beat ${note.beat}`).toBeGreaterThanOrEqual(MIDI_MIN);
        expect(note.midi, `${song.id} note at beat ${note.beat}`).toBeLessThanOrEqual(MIDI_MAX);
        expect(note.duration, `${song.id} duration at beat ${note.beat}`).toBeGreaterThan(0);
        if (note.finger !== undefined) {
          expect(Number.isInteger(note.finger)).toBe(true);
          expect(note.finger).toBeGreaterThanOrEqual(1);
          expect(note.finger).toBeLessThanOrEqual(5);
        }
      }
    }
  });

  it('ensures each section startBeat is strictly less than endBeat', () => {
    for (const song of SONGS) {
      expect(song.sections.length, `${song.id} should have sections`).toBeGreaterThan(0);
      for (const sec of song.sections) {
        expect(sec.startBeat, `${song.id} section ${sec.id}`).toBeLessThan(sec.endBeat);
      }
    }
  });

  it('ensures no right-hand lesson note has sustainClear except possibly at bar start', () => {
    for (const song of LESSON_SONGS) {
      for (const note of song.notes) {
        if (note.hand === 'R' && note.sustainClear) {
          expect(note.beat % 4, `${song.id} RH note at beat ${note.beat} has sustainClear`).toBe(0);
        }
      }
    }
  });

  it('ensures no left-hand and right-hand notes share identical midi with overlapping time', () => {
    for (const song of LESSON_SONGS) {
      const leftNotes = song.notes.filter((n) => n.hand === 'L');
      const rightNotes = song.notes.filter((n) => n.hand === 'R');

      for (const lh of leftNotes) {
        const lhStart = lh.beat;
        const lhEnd = lh.beat + lh.duration;
        for (const rh of rightNotes) {
          if (lh.midi === rh.midi) {
            const rhStart = rh.beat;
            const rhEnd = rh.beat + rh.duration;
            const overlaps = Math.max(lhStart, rhStart) < Math.min(lhEnd, rhEnd);
            expect(
              overlaps,
              `${song.id} unison conflict on midi ${lh.midi} between LH [${lhStart}, ${lhEnd}) and RH [${rhStart}, ${rhEnd})`
            ).toBe(false);
          }
        }
      }
    }
  });
});
