import { describe, it, expect } from 'vitest';
import { Song } from '../../types/midi';
import { Transport } from '../Transport';

const TWO_HAND: Song['notes'] = [
  { beat: 0, duration: 1, midi: 60, hand: 'L', role: 'root' },
  { beat: 0, duration: 1, midi: 64, hand: 'R', role: 'third' },
];
const makeSong = (notes: Song['notes'], bpm = 120): Song => ({
  id: 'chord-test', title: 'Chord Test', bpm, timeSignature: [4, 4],
  sections: [{ id: 's1', name: 'S1', startBeat: 0, endBeat: 4, chords: [{ beat: 0, symbol: 'C', rootMidi: 60 }] }],
  notes,
});
const waitMidis = (tr: Transport, dtMs: number) => tr.step(dtMs).waitingNotes.map((n) => n.midi);

describe('Wait-Mode simultaneous chord gating', () => {
  it('resets partial chord match on wrong hit and requires both notes together to pass', () => {
    let now = 0; const tr = new Transport(makeSong(TWO_HAND), () => now); tr.setPlaying(true);
    tr.registerNoteOn(60, now);
    expect(waitMidis(tr, 16)).toEqual([64]);
    tr.registerNoteOn(62, now); tr.registerNoteOn(64, now);
    expect(waitMidis(tr, 16)).toContain(60);
    now += 50; tr.step(50); now += 50; tr.step(50); now += 30; tr.step(30);
    tr.registerNoteOn(60, now); tr.registerNoteOn(64, now);
    expect(tr.step(16).waitingNotes).toEqual([]);
  });

  it('expires partial chord match after > 120 ms without another keystroke', () => {
    let now = 0; const tr = new Transport(makeSong(TWO_HAND), () => now); tr.setPlaying(true);
    tr.registerNoteOn(60, now);
    expect(waitMidis(tr, 16)).toEqual([64]);
    now += 50; tr.step(50); now += 50; tr.step(50); now += 30;
    expect(waitMidis(tr, 30)).toEqual([60, 64]);
    tr.registerNoteOn(64, now);
    expect(waitMidis(tr, 16)).toEqual([60]);
  });

  it('rejects early NoteOff release across steps and staccato within the same frame', () => {
    let now = 0; const tr1 = new Transport(makeSong(TWO_HAND), () => now); tr1.setPlaying(true);
    tr1.registerNoteOn(60, now); tr1.step(20);
    now += 20; tr1.registerNoteOff(60, now); tr1.registerNoteOn(64, now);
    expect(waitMidis(tr1, 20)).toEqual([60]);
    let now2 = 0; const tr2 = new Transport(makeSong(TWO_HAND), () => now2); tr2.setPlaying(true);
    tr2.registerNoteOn(60, now2); tr2.registerNoteOff(60, now2); tr2.registerNoteOn(64, now2);
    expect(waitMidis(tr2, 20)).toEqual([60]);
  });

  it('accepts a valid chord roll at 100 ms (<= 120 ms) without freezing', () => {
    let now = 0; const tr = new Transport(makeSong(TWO_HAND), () => now); tr.setPlaying(true);
    tr.registerNoteOn(60, now);
    now += 50; tr.step(50); now += 50; tr.step(50);
    tr.registerNoteOn(64, now);
    const snap = tr.step(16);
    expect(snap.waitingNotes).toEqual([]);
    expect(snap.isFrozen).toBe(false);
    expect(snap.speedMultiplier).toBe(1);
  });

  it('does not reset single-note groups on wrong hits', () => {
    let now = 0; const single: Song['notes'] = [{ beat: 0, duration: 1, midi: 60, hand: 'R', role: 'melody' }];
    const tr = new Transport(makeSong(single), () => now); tr.setPlaying(true);
    tr.registerNoteOn(62, now);
    expect(waitMidis(tr, 16)).toEqual([60]);
    tr.registerNoteOn(60, now);
    expect(tr.step(16).waitingNotes).toEqual([]);
  });

  it('clears partial chord match when pausing via setPlaying(false)', () => {
    let now = 0; const tr = new Transport(makeSong(TWO_HAND), () => now); tr.setPlaying(true);
    tr.registerNoteOn(60, now);
    expect(waitMidis(tr, 16)).toEqual([64]);
    tr.setPlaying(false);
    expect(tr.setPlaying(true).waitingNotes.map((n) => n.midi)).toEqual([60, 64]);
  });

  it('clears queued hitQueue events when switching handIsolation', () => {
    let now = 0; const tr = new Transport(makeSong(TWO_HAND), () => now); tr.setPlaying(true);
    tr.registerNoteOn(64, now);
    tr.setHandIsolation('RIGHT_ONLY');
    expect(waitMidis(tr, 16)).toEqual([64]);
  });

  it('resets entire partial match on early NoteOff in a 3-note chord', () => {
    const triad: Song['notes'] = [...TWO_HAND, { beat: 0, duration: 1, midi: 67, hand: 'R', role: 'fifth' }];
    let now = 0; const tr = new Transport(makeSong(triad), () => now); tr.setPlaying(true);
    tr.registerNoteOn(60, now);
    now = 40; tr.registerNoteOn(64, now);
    expect(waitMidis(tr, 16)).toEqual([67]);
    now = 50; tr.registerNoteOff(60, now);
    expect(waitMidis(tr, 16)).toEqual([60, 64, 67]);
  });

  it('renews roll window when re-striking the sole matched note in a chord', () => {
    let now = 0; const tr = new Transport(makeSong(TWO_HAND), () => now); tr.setPlaying(true);
    tr.registerNoteOn(60, now); tr.step(16);
    now = 80; tr.registerNoteOn(60, now); tr.step(50);
    now = 130; tr.step(50);
    now = 180; tr.registerNoteOn(64, now);
    expect(tr.step(16).waitingNotes).toEqual([]);
  });

  it('drains trailing brush NoteOn (<= 25 ms) after completing a chord', () => {
    const twoChords: Song['notes'] = [
      ...TWO_HAND,
      { beat: 0.1, duration: 1, midi: 65, hand: 'L', role: 'root' },
      { beat: 0.1, duration: 1, midi: 69, hand: 'R', role: 'third' },
    ];
    let now = 0; const tr = new Transport(makeSong(twoChords), () => now); tr.setPlaying(true);
    tr.registerNoteOn(60, 0); tr.registerNoteOn(64, 0); tr.registerNoteOn(65, 10);
    expect(waitMidis(tr, 16)).toEqual([65, 69]);
    now = 20;
    expect(waitMidis(tr, 20)).toEqual([65, 69]);
  });

  it('does not unfreeze or advance beat when spamming one key of a frozen chord', () => {
    let now = 0; const tr = new Transport(makeSong(TWO_HAND), () => now); tr.setPlaying(true);
    for (let i = 0; i < 7; i++) { now += 45; tr.step(45); }
    const frozenBeat = tr.step(16).beat;
    tr.registerNoteOn(64, now);
    const s1 = tr.step(20);
    expect([s1.isFrozen, s1.speedMultiplier, s1.beat]).toEqual([true, 0, frozenBeat]);
    now += 20; tr.registerNoteOff(64, now); tr.registerNoteOn(64, now + 10); now += 20;
    const s2 = tr.step(20);
    expect([s2.isFrozen, s2.beat]).toEqual([true, frozenBeat]);
  });

  it('freezes permanently despite continuous on/off single-key spamming past +240 ms', () => {
    let now = 0; const tr = new Transport(makeSong(TWO_HAND), () => now); tr.setPlaying(true);
    for (let i = 0; i < 10; i++) {
      tr.registerNoteOn(64, now); now += 25; tr.step(25);
      tr.registerNoteOff(64, now); now += 25; tr.step(25);
    }
    const end = tr.step(16);
    expect([end.isFrozen, end.speedMultiplier]).toEqual([true, 0]);
    now += 20; tr.registerNoteOn(64, now);
    expect(tr.step(20).beat).toBe(end.beat);
  });

  it('snaps beat back to g.beat when a late chord roll finishes between 120 and 240 ms', () => {
    let now = 0; const tr = new Transport(makeSong(TWO_HAND), () => now); tr.setPlaying(true);
    now += 45; tr.step(45); now += 45; tr.step(45);
    tr.registerNoteOn(60, now);
    now += 40; tr.step(40); now += 40; tr.step(40);
    tr.registerNoteOn(64, now);
    const snap = tr.step(16);
    expect(snap.waitingNotes).toEqual([]);
    expect(snap.beat).toBeCloseTo(0.032, 3);
  });
});
