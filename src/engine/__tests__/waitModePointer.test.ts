import { describe, it, expect } from 'vitest';
import { Song } from '../../types/midi';
import { Transport } from '../Transport';

interface WaitStateView {
  matchedInPending: Set<number>;
  pointerMatched: Set<number>;
  hitQueue: unknown[];
}

const getWs = (tr: Transport) => (tr as unknown as { ws: WaitStateView }).ws;
const TWO_NOTE: Song['notes'] = [
  { beat: 0, duration: 1, midi: 60, hand: 'L', role: 'root' },
  { beat: 0, duration: 1, midi: 64, hand: 'R', role: 'third' },
];
const TRIAD: Song['notes'] = [...TWO_NOTE, { beat: 0, duration: 1, midi: 67, hand: 'R', role: 'fifth' }];
const makeSong = (notes: Song['notes'], bpm = 120): Song => ({
  id: 'ptr-test', title: 'Pointer Test', bpm, timeSignature: [4, 4],
  sections: [{ id: 's1', name: 'S1', startBeat: 0, endBeat: 4, chords: [{ beat: 0, symbol: 'C', rootMidi: 60 }] }],
  notes,
});

const freezeWithSteps = (tr: Transport, advance: (ms: number) => void) => {
  for (let i = 0; i < 10; i++) { advance(45); tr.step(45); }
  return tr.step(16);
};

describe('Wait-Mode pointer click chaining (#12) & DEMO input guard (#18)', () => {
  it('completes 2-note chord via sequential pointer clicks across >120ms freeze and snaps beat back to g.beat', () => {
    let now = 0; const tr = new Transport(makeSong(TWO_NOTE), () => now); tr.setPlaying(true);
    tr.registerNoteOn(60, now, 'pointer');
    now += 30; tr.registerNoteOff(60, now, 'pointer');
    expect(tr.step(16).waitingNotes.map((n) => n.midi)).toEqual([64]);

    const frozen = freezeWithSteps(tr, (ms) => { now += ms; });
    expect(frozen.isFrozen).toBe(true);
    expect(frozen.beat).toBeGreaterThan(0.2);

    tr.registerNoteOn(64, now, 'pointer');
    now += 30; tr.registerNoteOff(64, now, 'pointer');
    const done = tr.step(16);
    expect(done.waitingNotes).toEqual([]);
    expect(done.isFrozen).toBe(false);
    expect(done.speedMultiplier).toBe(1);
    expect(done.beat).toBeCloseTo(0.032, 3);
  });

  it('completes 3-note chord via sequential pointer clicks after freezing between each note', () => {
    let now = 0; const tr = new Transport(makeSong(TRIAD), () => now); tr.setPlaying(true);
    tr.registerNoteOn(60, now, 'pointer'); now += 20; tr.registerNoteOff(60, now, 'pointer');
    expect(freezeWithSteps(tr, (ms) => { now += ms; }).isFrozen).toBe(true);

    tr.registerNoteOn(64, now, 'pointer'); now += 20; tr.registerNoteOff(64, now, 'pointer');
    const mid = tr.step(16);
    expect(mid.isFrozen).toBe(true);
    expect(mid.waitingNotes.map((n) => n.midi)).toEqual([67]);

    now += 200;
    tr.registerNoteOn(67, now, 'pointer'); now += 20; tr.registerNoteOff(67, now, 'pointer');
    const done = tr.step(16);
    expect(done.waitingNotes).toEqual([]);
    expect(done.isFrozen).toBe(false);
    expect(done.beat).toBeCloseTo(0.032, 3);
  });

  it('preserves pointerMatched & matchedInPending on pointer double-click, resets both on wrong note', () => {
    let now = 0; const tr = new Transport(makeSong(TWO_NOTE), () => now); tr.setPlaying(true);
    tr.registerNoteOn(60, now, 'pointer'); now += 20; tr.registerNoteOff(60, now, 'pointer');
    tr.step(16);
    expect(getWs(tr).matchedInPending.size).toBe(1);
    expect(getWs(tr).pointerMatched.size).toBe(1);

    now += 200;
    tr.registerNoteOn(60, now, 'pointer'); now += 20; tr.registerNoteOff(60, now, 'pointer');
    expect(tr.step(16).waitingNotes.map((n) => n.midi)).toEqual([64]);
    expect(getWs(tr).matchedInPending.size).toBe(1);
    expect(getWs(tr).pointerMatched.size).toBe(1);

    tr.registerNoteOn(62, now, 'pointer'); now += 20; tr.registerNoteOff(62, now, 'pointer');
    expect(tr.step(16).waitingNotes.map((n) => n.midi)).toEqual([60, 64]);
    expect(getWs(tr).matchedInPending.size).toBe(0);
    expect(getWs(tr).pointerMatched.size).toBe(0);
  });

  it('hybrid pointer+midi clears both matchedInPending and pointerMatched on early midi release', () => {
    let now = 0; const tr = new Transport(makeSong(TRIAD), () => now); tr.setPlaying(true);
    tr.registerNoteOn(60, now, 'pointer'); now += 20; tr.registerNoteOff(60, now, 'pointer');
    tr.step(16);
    tr.registerNoteOn(64, now, 'midi');
    expect(tr.step(16).waitingNotes.map((n) => n.midi)).toEqual([67]);

    now += 20; tr.registerNoteOff(64, now, 'midi');
    expect(tr.step(16).waitingNotes.map((n) => n.midi)).toEqual([60, 64, 67]);
    expect(getWs(tr).matchedInPending.size).toBe(0);
    expect(getWs(tr).pointerMatched.size).toBe(0);
  });

  it('hybrid pointer+midi clears both sets on >120ms midi delay and keeps strict 120ms rule active', () => {
    let now = 0; const tr = new Transport(makeSong(TWO_NOTE), () => now); tr.setPlaying(true);
    tr.registerNoteOn(60, now, 'pointer'); now += 20; tr.registerNoteOff(60, now, 'pointer');
    tr.step(16);

    now += 140;
    tr.registerNoteOn(64, now, 'midi');
    expect(tr.step(16).waitingNotes.map((n) => n.midi)).toEqual([60]);
    expect(getWs(tr).pointerMatched.size).toBe(0);

    now += 150;
    expect(tr.step(16).waitingNotes.map((n) => n.midi)).toEqual([60, 64]);
  });

  it('expires hybrid midi-first + pointer-second partial match after >120ms so MIDI cannot cheat', () => {
    let now = 0; const tr = new Transport(makeSong(TRIAD), () => now); tr.setPlaying(true);
    tr.registerNoteOn(60, now, 'midi');
    now += 30; tr.registerNoteOn(64, now, 'pointer'); tr.registerNoteOff(64, now, 'pointer');
    expect(tr.step(16).waitingNotes.map((n) => n.midi)).toEqual([67]);

    now += 130;
    expect(tr.step(16).waitingNotes.map((n) => n.midi)).toEqual([60, 64, 67]);
    expect(getWs(tr).matchedInPending.size).toBe(0);
    expect(getWs(tr).pointerMatched.size).toBe(0);
  });

  it('ignores registerNoteOn/Off in DEMO mode and leaves no stale hits after switching to BOTH (#18)', () => {
    const seq: Song['notes'] = [...TWO_NOTE, { beat: 0.2, duration: 1, midi: 65, hand: 'L', role: 'root' }];
    let now = 0; const tr = new Transport(makeSong(seq), () => now);
    tr.setHandIsolation('DEMO');
    tr.setPlaying(true);
    tr.registerNoteOn(60, now, 'midi');
    tr.registerNoteOn(65, now, 'midi');
    tr.registerNoteOff(60, now, 'midi');
    expect(getWs(tr).hitQueue).toHaveLength(0);

    now += 25; tr.step(25);
    tr.setPlaying(false);
    tr.setHandIsolation('BOTH');
    expect(tr.setPlaying(true).waitingNotes.map((n) => n.midi)).toEqual([65]);
    expect(tr.step(16).waitingNotes.map((n) => n.midi)).toEqual([65]);
  });
});
