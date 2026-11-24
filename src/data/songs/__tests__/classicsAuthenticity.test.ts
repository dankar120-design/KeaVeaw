import { describe, it, expect } from 'vitest';
import { REPERTOIRE_SONGS } from '../index';
import { classicBachPreludeC } from '../classicBachPreludeC';
import { classicFurElise } from '../classicFurElise';
import { classicPassacagliaEasy } from '../classicPassacagliaEasy';
import { classicPassacagliaVar } from '../classicPassacagliaVar';
import { chordPitchClasses, chordRootPitchClass } from '../../../utils/musicTheory';
import { MIDI_MAX, MIDI_MIN, Song } from '../../../types/midi';

function lastNoteEnd(song: Song): number {
  return song.notes.reduce((max, n) => Math.max(max, n.beat + n.duration), 0);
}

function sectionEnd(song: Song): number {
  return song.sections.reduce((max, s) => Math.max(max, s.endBeat), 0);
}

describe('Classics authenticity, musicTheory dim7//bass & Pachelbel Canon', () => {
  it('supports dim7, m7b5, 7sus4 and slash bass stripping in musicTheory', () => {
    expect(chordRootPitchClass('Dm7/C')).toBe(2);
    expect(chordRootPitchClass('C#dim7/G')).toBe(1);
    expect([...chordPitchClasses('F#dim7')].sort((a, b) => a - b)).toEqual([0, 3, 6, 9]);
    expect([...chordPitchClasses('Dm7b5')].sort((a, b) => a - b)).toEqual([0, 2, 5, 8]);
    expect([...chordPitchClasses('G7sus4')].sort((a, b) => a - b)).toEqual([0, 2, 5, 7]);
  });

  it('plays full 35-bar Bach BWV 846 with C4-C4-B3-C4 pedal bass, G7/C non-fifth role & ring-out tail', () => {
    const chords = classicBachPreludeC.sections.flatMap((s) => s.chords);
    expect(chords.length).toBeGreaterThanOrEqual(35);
    const tailEnd = lastNoteEnd(classicBachPreludeC);
    expect(tailEnd).toBeGreaterThanOrEqual(140);
    expect(sectionEnd(classicBachPreludeC) - tailEnd).toBeGreaterThanOrEqual(1.5);

    const bassFirst4 = [0, 4, 8, 12].map(
      (b) => classicBachPreludeC.notes.find((n) => n.hand === 'L' && n.beat === b)?.midi
    );
    expect(bassFirst4).toEqual([60, 60, 59, 60]);

    const finalBarLongNotes = classicBachPreludeC.notes.filter((n) => n.beat >= 136 && n.duration >= 3.5);
    expect(finalBarLongNotes.length).toBeGreaterThanOrEqual(2);
    const g7cBass = classicBachPreludeC.notes.find((n) => n.hand === 'L' && n.beat === 132 && n.midi === 48);
    expect(g7cBass?.role).not.toBe('fifth');
  });

  it('fixes Für Elise silent LH motif, 3-beat rising LH, B-section pitches & 2nd ending cadence', () => {
    const lhMotif1 = classicFurElise.notes.filter((n) => n.hand === 'L' && n.beat >= 3 && n.beat < 6);
    const lhMotif2 = classicFurElise.notes.filter((n) => n.hand === 'L' && n.beat >= 15 && n.beat < 18);
    expect(lhMotif1.length).toBe(0);
    expect(lhMotif2.length).toBe(0);

    const bar2Lh = classicFurElise.notes.filter((n) => n.hand === 'L' && n.beat >= 6 && n.beat < 9);
    expect(bar2Lh.map((n) => n.beat)).toEqual([6, 6.5, 7]);
    expect(bar2Lh[0].midi).toBeLessThan(bar2Lh[1].midi);

    const bar27Rh = classicFurElise.notes.filter((n) => n.hand === 'R' && n.beat >= 27 && n.beat < 30).map((n) => n.midi);
    const bar30Rh = classicFurElise.notes.filter((n) => n.hand === 'R' && n.beat >= 30 && n.beat < 33).map((n) => n.midi);
    expect(bar27Rh).toEqual([76, 67, 77, 76]);
    expect(bar30Rh).toEqual([74, 65, 76, 74]);

    expect(classicFurElise.sections[2]?.chords.map((c) => c.beat)).toEqual([39, 42, 45, 48]);
    const bar45Rh = classicFurElise.notes.filter((n) => n.hand === 'R' && n.beat >= 45 && n.beat < 48).map((n) => n.midi);
    expect(bar45Rh).toEqual([71, 64, 72, 71]);
    const finalRh = classicFurElise.notes.find((n) => n.hand === 'R' && n.beat === 48);
    expect(finalRh?.midi).toBe(69);
    expect(finalRh?.duration).toBeGreaterThanOrEqual(2.5);

    const tailEnd = lastNoteEnd(classicFurElise);
    expect(tailEnd).toBeGreaterThanOrEqual(51);
    expect(sectionEnd(classicFurElise) - tailEnd).toBeGreaterThanOrEqual(1.5);
  });

  it('uses ascending LH bass arpeggios and ring-out tail in Passacaglia Easy & Var', () => {
    for (const beat of [12, 44]) {
      const lh = classicPassacagliaEasy.notes.filter((n) => n.hand === 'L' && n.beat >= beat && n.beat < beat + 4);
      expect(lh[0].midi, `Easy beat ${beat}`).toBeLessThan(lh[1].midi);
    }
    for (let beat = 0; beat < 64; beat += 4) {
      const lh = classicPassacagliaVar.notes.filter((n) => n.hand === 'L' && n.beat >= beat && n.beat < beat + 4);
      expect(lh[0].midi, `Var beat ${beat}`).toBeLessThan(lh[1].midi);
    }
    expect(sectionEnd(classicPassacagliaEasy) - lastNoteEnd(classicPassacagliaEasy)).toBeGreaterThanOrEqual(1.5);
    expect(sectionEnd(classicPassacagliaVar) - lastNoteEnd(classicPassacagliaVar)).toBeGreaterThanOrEqual(1.5);
  });

  it('includes Pachelbel Canon in C with harmonic downbeats, clean half-bar changes & bounds', () => {
    const canon = REPERTOIRE_SONGS.find((s) => s.id === 'classic-pachelbel-canon');
    expect(canon).toBeDefined();
    if (!canon) return;
    expect(canon.timeSignature).toEqual([4, 4]);
    const symbols = canon.sections[0].chords.slice(0, 8).map((c) => c.symbol);
    expect(symbols).toEqual(['C', 'G', 'Am', 'Em', 'F', 'C', 'F', 'G']);

    const chords = canon.sections.flatMap((s) => s.chords);
    for (const chord of chords) {
      const pcs = chordPitchClasses(chord.symbol);
      const downbeatRh = canon.notes.find((n) => n.hand === 'R' && Math.abs(n.beat - chord.beat) < 1e-4);
      expect(downbeatRh, `Canon RH downbeat at beat ${chord.beat} (${chord.symbol})`).toBeDefined();
      if (downbeatRh) expect(pcs.has(downbeatRh.midi % 12), `beat ${chord.beat} midi ${downbeatRh.midi} not in ${chord.symbol}`).toBe(true);
    }

    const chordBeats = new Set(chords.map((c) => c.beat));
    for (const n of canon.notes) {
      expect(n.midi).toBeGreaterThanOrEqual(MIDI_MIN);
      expect(n.midi).toBeLessThanOrEqual(MIDI_MAX);
      for (const cb of chordBeats) {
        if (n.beat < cb) expect(n.beat + n.duration, `Canon note beat ${n.beat} bleeds past chord ${cb}`).toBeLessThanOrEqual(cb + 1e-4);
      }
    }
    expect(canon.notes.filter((n) => n.hand === 'L' && n.beat < 64).length).toBe(32);
    const del1b = [16, 18, 20, 22, 24, 26, 28, 30].map((b) => canon.notes.find((n) => n.hand === 'R' && n.beat === b)?.midi);
    expect(del1b).toEqual([72, 71, 69, 67, 65, 64, 65, 74]);
    expect(canon.notes.some((n) => n.hand === 'R' && n.beat >= 48 && n.duration === 0.25)).toBe(true);
    expect(sectionEnd(canon) - lastNoteEnd(canon)).toBeGreaterThanOrEqual(1.5);
  });

  it('includes standard Passacaglia (Original) with 1-note LH bass, passing 8ths, Del 3 16ths & tail', () => {
    const orig = REPERTOIRE_SONGS.find((s) => s.id === 'classic-passacaglia');
    expect(orig).toBeDefined();
    if (!orig) return;
    expect(orig.bpm).toBe(78);
    expect(orig.sections.length).toBe(3);
    for (const sec of orig.sections) {
      expect(sec.chords.map((c) => c.symbol)).toEqual(['Gm', 'Cm', 'F', 'Bb', 'Eb', 'Cm', 'D', 'Gm']);
    }
    expect(orig.notes.filter((n) => n.hand === 'L' && n.beat < 96).length).toBe(24);
    expect(orig.notes.find((n) => n.hand === 'R' && n.beat === 5.5)?.midi).toBe(74);
    expect(orig.notes.find((n) => n.hand === 'R' && n.beat === 13.5)?.midi).toBe(72);
    expect(orig.notes.find((n) => n.hand === 'R' && n.beat === 27.5)?.midi).toBe(72);
    expect(orig.notes.filter((n) => n.hand === 'R' && n.beat >= 32 && n.beat < 64).length).toBe(64);
    expect(orig.notes.some((n) => n.hand === 'R' && n.beat >= 64 && n.duration === 0.25)).toBe(true);
    expect(orig.notes.find((n) => n.hand === 'R' && n.beat === 64)?.midi).toBe(79);
    expect(sectionEnd(orig) - lastNoteEnd(orig)).toBeGreaterThanOrEqual(1.5);
  });
});
