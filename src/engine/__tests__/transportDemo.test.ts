import { describe, it, expect } from 'vitest';
import { Transport } from '../Transport';
import { splitHands } from '../transportHelpers';
import { fMinorArpeggio } from '../../data/songs/fMinorArpeggio';
import { Song, SongNote } from '../../types/midi';

describe('Transport DEMO mode and hand isolation switching', () => {
  const sampleNotes: SongNote[] = [
    { beat: 0, duration: 1, midi: 53, hand: 'L', role: 'root' },
    { beat: 0, duration: 1, midi: 72, hand: 'R', role: 'melody' },
  ];

  it('splitHands in DEMO mode routes all notes to auto and none to user', () => {
    const res = splitHands(sampleNotes, 'DEMO');
    expect(res.user).toEqual([]);
    expect(res.auto).toEqual(sampleNotes);
  });

  it('setHandIsolation returns snapshot and cancels active auto notes into autoNoteOffs', () => {
    let now = 0;
    const tr = new Transport(fMinorArpeggio, () => now);
    tr.setHandIsolation('RIGHT_ONLY');
    tr.setPlaying(true);

    now += 50;
    const s1 = tr.step(50);
    expect(s1.autoNoteOns.some((n) => n.midi === 53)).toBe(true);

    const snap = tr.setHandIsolation('DEMO');
    expect(snap).toBeDefined();
    expect(snap.autoNoteOffs).toContain(53);
    expect(snap.playing).toBe(true);
  });

  it('setHandIsolation(DEMO) resets wait freeze, speedMultiplier, missElapsed and hitQueue', () => {
    let now = 0;
    const tr = new Transport(fMinorArpeggio, () => now);
    tr.setPlaying(true);

    for (let i = 0; i < 15; i++) {
      now += 45;
      tr.step(45);
    }
    expect(tr.getSnapshot().isFrozen).toBe(true);

    const snap = tr.setHandIsolation('DEMO');
    expect(snap.isFrozen).toBe(false);
    expect(snap.speedMultiplier).toBe(1);
    expect(snap.waitingNotes).toEqual([]);

    const collectedOns: SongNote[] = [];
    for (let i = 0; i < 40; i++) {
      now += 45;
      const stepSnap = tr.step(45);
      expect(stepSnap.isFrozen).toBe(false);
      expect(stepSnap.waitingNotes).toEqual([]);
      for (const n of stepSnap.autoNoteOns) collectedOns.push(n);
    }
    expect(collectedOns.some((n) => n.hand === 'L')).toBe(true);
    expect(collectedOns.some((n) => n.hand === 'R')).toBe(true);
  });

  it('syncs completedGroups and triggeredAutoGroups to beat on isolation switch', () => {
    let now = 0;
    const tr = new Transport(fMinorArpeggio, () => now);
    tr.shiftLoop(6);
    const snap = tr.setHandIsolation('LEFT_ONLY');
    expect(snap.beat).toBeCloseTo(6, 2);
    expect(snap.waitingNotes.every((n) => n.beat >= 6 - 1e-4)).toBe(true);
  });

  it('clears sustain when switching away from DEMO mode to BOTH', () => {
    const tr = new Transport(fMinorArpeggio);
    tr.setHandIsolation('DEMO');
    const snap = tr.setHandIsolation('BOTH');
    expect(snap.shouldClearSustain).toBe(true);
  });

  it('does not re-trigger auto-group at exact current beat when setHandIsolation is called', () => {
    const song: Song = {
      id: 'test-isolation-beat',
      title: 'Test Isolation',
      bpm: 60,
      timeSignature: [4, 4],
      sections: [],
      notes: [
        { beat: 0, duration: 1, midi: 53, hand: 'L', role: 'root' },
        { beat: 4, duration: 1, midi: 60, hand: 'L', role: 'root' },
      ],
    };
    const tr = new Transport(song);
    tr.setHandIsolation('RIGHT_ONLY');
    tr.shiftLoop(4);
    tr.setPlaying(true);

    const firstSnap = tr.step(0);
    expect(firstSnap.beat).toBe(4);
    expect(firstSnap.autoNoteOns.some((n) => n.midi === 60)).toBe(true);

    tr.setHandIsolation('RIGHT_ONLY');
    const nextSnap = tr.step(0.1);
    expect(nextSnap.autoNoteOns.some((n) => n.midi === 60)).toBe(false);
  });
});
