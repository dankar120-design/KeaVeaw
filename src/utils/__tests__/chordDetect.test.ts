import { describe, it, expect } from 'vitest';
import { detectChordName, shouldPreferFlats } from '../chordDetect';

describe('detectChordName', () => {
  it('returns null when fewer than 3 distinct pitch classes are present', () => {
    expect(detectChordName([])).toBeNull();
    expect(detectChordName([60])).toBeNull();
    expect(detectChordName([60, 64])).toBeNull();
    expect(detectChordName([48, 60, 72])).toBeNull();
    expect(detectChordName([60, 64, 72])).toBeNull();
  });

  it('returns null for unrecognized tone clusters', () => {
    expect(detectChordName([60, 61, 62])).toBeNull();
  });

  it('detects all root-position triads and seventh/sixth chords', () => {
    const cases: Array<[number[], string]> = [
      [[60, 64, 67], 'C'],
      [[60, 63, 67], 'Cm'],
      [[60, 63, 66], 'Cdim'],
      [[60, 64, 68], 'Caug'],
      [[60, 65, 67], 'Csus4'],
      [[60, 62, 67], 'Csus2'],
      [[60, 64, 67, 71], 'Cmaj7'],
      [[57, 60, 64, 67], 'Am7'],
      [[55, 59, 62, 65], 'G7'],
      [[59, 62, 65, 69], 'Bm7b5'],
      [[60, 63, 66, 69], 'Cdim7'],
      [[55, 60, 62, 65], 'G7sus4'],
      [[60, 64, 67, 69], 'C6'],
      [[60, 63, 67, 69], 'Cm6'],
    ];
    for (const [midis, expected] of cases) {
      expect(detectChordName(midis)).toBe(expected);
    }
  });

  it('handles octave doubling and unsorted input', () => {
    expect(detectChordName([67, 48, 64, 60])).toBe('C');
  });

  it('detects slash bass inversions', () => {
    expect(detectChordName([64, 67, 72])).toBe('C/E');
    expect(detectChordName([55, 60, 64])).toBe('C/G');
    expect(detectChordName([64, 67, 71, 72])).toBe('Cmaj7/E');
  });

  it('prefers deterministic root-position tie-breaking', () => {
    expect(detectChordName([60, 64, 67, 69])).toBe('C6');
    expect(detectChordName([60, 65, 67])).toBe('Csus4');
    expect(detectChordName([60, 63, 66, 69])).toBe('Cdim7');
    expect(detectChordName([63, 66, 69, 72])).toBe('Ebdim7');
  });

  it('uses piano-standard enharmonics and supports preferFlats override', () => {
    expect(detectChordName([58, 62, 65])).toBe('Bb');
    expect(detectChordName([63, 67, 70])).toBe('Eb');
    expect(detectChordName([56, 59, 62, 65])).toBe('Abdim7');
    expect(detectChordName([54, 57, 60, 63])).toBe('F#dim7');
    expect(detectChordName([61, 64, 67, 70])).toBe('C#dim7');
    expect(detectChordName([61, 65, 68], true)).toBe('Db');
    expect(detectChordName([61, 65, 68], false)).toBe('C#');
  });

  it('detects add9, m(maj7), and 9th chord extensions', () => {
    const cases: Array<[number[], string]> = [
      [[60, 62, 64, 67], 'Cadd9'],
      [[60, 62, 63, 67], 'Cmadd9'],
      [[60, 63, 67, 71], 'Cm(maj7)'],
      [[60, 64, 67, 71, 74], 'Cmaj9'],
      [[60, 63, 67, 70, 74], 'Cm9'],
      [[60, 64, 67, 70, 74], 'C9'],
    ];
    for (const [midis, expected] of cases) {
      expect(detectChordName(midis)).toBe(expected);
    }
  });
});

describe('shouldPreferFlats', () => {
  it('returns true for flat symbols and flat-key tonics, false for sharp/natural symbols', () => {
    for (const s of ['Bb', 'Db', 'Eb', 'Abdim7', 'Fm', 'Gm', 'Dm', 'F', 'F/C']) {
      expect(shouldPreferFlats(s)).toBe(true);
    }
    for (const s of ['F#dim7', 'C#dim7/G', 'C', 'Am', 'G7', null]) {
      expect(shouldPreferFlats(s)).toBe(false);
    }
  });
});
