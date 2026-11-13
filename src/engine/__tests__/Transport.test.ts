import { describe, it, expect } from 'vitest';
import { MIDI_MAX, MIDI_MIN, Song } from '../../types/midi';
import { SONGS } from '../../data/songs';
import { Transport } from '../Transport';

function makeSong(notes: Song['notes'], bpm = 120): Song {
  return {
    id: 'test-song',
    title: 'Test',
    bpm,
    timeSignature: [4, 4],
    sections: [{ id: 's1', name: 'S1', startBeat: 0, endBeat: 4, chords: [{ beat: 0, symbol: 'C', rootMidi: 60 }] }],
    notes,
  };
}

describe('Built-in SONGS dataset invariant (V2)', () => {
  it('contains 4 songs with every note strictly inside MIDI 53..84', () => {
    expect(SONGS.length).toBe(4);
    for (const song of SONGS) {
      expect(song.notes.length).toBeGreaterThan(16);
      for (const n of song.notes) {
        expect(n.midi).toBeGreaterThanOrEqual(MIDI_MIN);
        expect(n.midi).toBeLessThanOrEqual(MIDI_MAX);
      }
    }
  });
});

describe('Transport Elastic Wait-Mode (V3, V4, V5)', () => {
  it('handles early hits (-150ms), chord rolls (70ms), and requires discrete NoteOn for repeated notes (V3)', () => {
    let now = 0;
    const song = makeSong([
      { beat: 1, duration: 0.5, midi: 72, hand: 'R', role: 'melody' },
      { beat: 2, duration: 0.5, midi: 72, hand: 'R', role: 'melody' }, // repeated C5
      { beat: 3, duration: 0.5, midi: 60, hand: 'L', role: 'root' },
      { beat: 3, duration: 0.5, midi: 64, hand: 'R', role: 'third' },
    ], 120); // 500ms per beat
    const tr = new Transport(song, () => now);
    tr.setPlaying(true);

    // Advance to 0.7 beat (150ms before beat 1)
    for (let i = 0; i < 7; i++) { now += 50; tr.step(50); }
    tr.registerNoteOn(72, now); // early hit at -150ms
    const snap1 = tr.step(50);
    expect(snap1.speedMultiplier).toBe(1);

    // Advance past beat 2 + 130ms WITHOUT hitting C5 again -> must freeze (held key does NOT auto-pass)
    for (let i = 0; i < 20; i++) { now += 45; tr.step(45); }
    const frozenSnap = tr.step(50);
    expect(frozenSnap.isFrozen).toBe(true);
    expect(frozenSnap.waitingNotes.map((n) => n.midi)).toEqual([72]);

    // Hit repeated C5 to snap & recover
    tr.registerNoteOn(72, now);
    const recovered = tr.step(20);
    expect(recovered.speedMultiplier).toBe(1);
    expect(recovered.isFrozen).toBe(false);

    // Advance near beat 3 and roll chord 70ms apart
    while (tr.step(25).beat < 2.95) { now += 25; }
    tr.registerNoteOn(60, now);
    now += 70;
    tr.step(20);
    tr.registerNoteOn(64, now);
    const chordSnap = tr.step(20);
    expect(chordSnap.speedMultiplier).toBe(1);
  });

  it('freezes after +120ms over 150ms, ignores wrong notes, and snaps on target hit (V4)', () => {
    let now = 0;
    const song = makeSong([{ beat: 0, duration: 1, midi: 65, hand: 'R', role: 'root' }], 120);
    const tr = new Transport(song, () => now);
    tr.setPlaying(true);

    // Advance 130ms past beat 0 -> next step enters deceleration
    now += 45; tr.step(45);
    now += 45; tr.step(45);
    now += 40; tr.step(40);
    now += 20; const decel = tr.step(20);
    expect(decel.speedMultiplier).toBeLessThan(1);

    // Advance 150ms in 50ms chunks -> speedMultiplier hits 0.0
    for (let i = 0; i < 3; i++) { now += 50; tr.step(50); }
    expect(tr.step(10).isFrozen).toBe(true);

    // Wrong note keeps it frozen
    tr.registerNoteOn(66, now);
    expect(tr.step(10).isFrozen).toBe(true);

    // Correct note snaps back to beat 0 and restores 1.0
    tr.registerNoteOn(65, now);
    const snap = tr.step(16);
    expect(snap.isFrozen).toBe(false);
    expect(snap.speedMultiplier).toBe(1);
  });

  it('auto-plays L notes with scheduled noteOff in RIGHT_ONLY and emits allNotesOff on reset (V5)', () => {
    let now = 0;
    const song = makeSong([
      { beat: 0, duration: 0.5, midi: 53, hand: 'L', role: 'root', sustainClear: true },
      { beat: 1, duration: 0.5, midi: 72, hand: 'R', role: 'melody' },
    ], 120);
    const tr = new Transport(song, () => now);
    tr.setHandIsolation('RIGHT_ONLY');
    tr.setPlaying(true);

    const s0 = tr.step(20);
    expect(s0.autoNoteOns.map((n) => n.midi)).toEqual([53]);
    expect(s0.shouldClearSustain).toBe(true);

    // Advance past beat 0.5 (250ms at 120 BPM) -> auto noteOff for 53
    let sawOff = false;
    for (let i = 0; i < 8; i++) {
      now += 40;
      if (tr.step(40).autoNoteOffs.includes(53)) sawOff = true;
    }
    expect(sawOff).toBe(true);

    const resetSnap = tr.resetLoop();
    expect(resetSnap.allNotesOff).toBe(true);
    expect(resetSnap.beat).toBe(0);
    expect(resetSnap.loopStart).toBe(0);
    expect(resetSnap.loopEnd).toBeGreaterThan(0);
  });

  it('caps early hit window proportionally at 180 BPM so eighth notes do not collide', () => {
    let now = 0;
    const song = makeSong([
      { beat: 0, duration: 0.5, midi: 60, hand: 'R', role: 'root' },
      { beat: 0.5, duration: 0.5, midi: 60, hand: 'R', role: 'root' },
    ], 180); // 0.5 beat = 166.7ms -> earlyCapMs = 75ms
    const tr = new Transport(song, () => now);
    tr.setPlaying(true);

    // Hit beat 0 right away
    tr.registerNoteOn(60, now);
    tr.step(16); // beat ~ 0.048, 150ms before beat 0.5

    // Premature hit 150ms before beat 0.5 (> 75ms cap) must be discarded, NOT clear beat 0.5
    tr.registerNoteOn(60, now);
    for (let i = 0; i < 10; i++) { now += 45; tr.step(45); }
    expect(tr.step(50).isFrozen).toBe(true);
  });
});
