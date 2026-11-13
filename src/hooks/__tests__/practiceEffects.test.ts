import { describe, it, expect, vi } from 'vitest';
import { TransportSnapshot } from '../../types/midi';
import {
  applyTransportEffects,
  buildSnapshotDiffKey,
  combineActiveNotes,
  cycleHandIsolation,
  MultiSourceHoldTracker,
  setsEqual,
  shouldAutoStartOnPress,
} from '../practiceEffects';

function makeSnapshot(overrides: Partial<TransportSnapshot> = {}): TransportSnapshot {
  return {
    beat: 0,
    loopStart: 0,
    loopEnd: 8,
    playing: true,
    speedMultiplier: 1,
    isFrozen: false,
    waitingNotes: [],
    activeChord: null,
    autoNoteOns: [],
    autoNoteOffs: [],
    shouldClearSustain: false,
    allNotesOff: false,
    ...overrides,
  };
}

describe('MultiSourceHoldTracker (P4-2)', () => {
  it('keeps note active across overlapping sources until final release', () => {
    const holds = new MultiSourceHoldTracker();
    expect(holds.press(60, 'qwerty')).toBe(true);
    expect(holds.press(60, 'pointer')).toBe(false);
    expect(holds.press(64, 'qwerty')).toBe(true);

    expect(holds.release(60, 'qwerty')).toBe(false);
    expect(holds.getActiveMidis()).toEqual(new Set([60, 64]));

    expect(holds.releaseSource('qwerty')).toEqual([64]);
    expect(holds.getActiveMidis()).toEqual(new Set([60]));

    expect(holds.release(60, 'pointer')).toBe(true);
    expect(holds.getActiveMidis().size).toBe(0);
  });
});

describe('applyTransportEffects, cycleHandIsolation & diffs (P4-2, P4-3)', () => {
  it('forwards autoNoteOns/Offs, clearSustain, and allNotesOff cleanly', () => {
    const sink = { noteOn: vi.fn(), noteOff: vi.fn(), clearSustain: vi.fn(), allNotesOff: vi.fn() };
    const autoActive = new Set<number>();

    const changed = applyTransportEffects(
      makeSnapshot({
        shouldClearSustain: true,
        autoNoteOns: [{ beat: 0, duration: 1, midi: 53, hand: 'L', role: 'root' }],
        autoNoteOffs: [55],
      }),
      sink,
      autoActive
    );
    expect(changed).toBe(true);
    expect(sink.clearSustain).toHaveBeenCalledTimes(1);
    expect(sink.noteOff).toHaveBeenCalledWith(55);
    expect(sink.noteOn).toHaveBeenCalledWith(53, 0.72, true);
    expect(autoActive.has(53)).toBe(true);

    applyTransportEffects(makeSnapshot({ allNotesOff: true }), sink, autoActive);
    expect(sink.allNotesOff).toHaveBeenCalledTimes(1);
    expect(autoActive.size).toBe(0);
  });

  it('preserves user-held voices on loop-wrap while clearing autoActive and sustain', () => {
    const sink = { noteOn: vi.fn(), noteOff: vi.fn(), clearSustain: vi.fn(), allNotesOff: vi.fn() };
    const autoActive = new Set<number>([53, 60]);
    const userHeld = new Set<number>([60]);

    applyTransportEffects(
      makeSnapshot({ allNotesOff: true, autoNoteOffs: [55] }),
      sink,
      autoActive,
      true,
      userHeld
    );

    expect(sink.allNotesOff).not.toHaveBeenCalled();
    expect(sink.clearSustain).toHaveBeenCalledTimes(1);
    expect(sink.noteOff).toHaveBeenCalledWith(55);
    expect(sink.noteOff).toHaveBeenCalledWith(53);
    expect(sink.noteOff).not.toHaveBeenCalledWith(60);
    expect(autoActive.size).toBe(0);
  });

  it('cycles HandIsolation and compares sets/snapshots deterministically', () => {
    expect(cycleHandIsolation('BOTH')).toBe('RIGHT_ONLY');
    expect(cycleHandIsolation('RIGHT_ONLY')).toBe('LEFT_ONLY');
    expect(cycleHandIsolation('LEFT_ONLY')).toBe('BOTH');

    const holds = new MultiSourceHoldTracker();
    holds.press(60, 'midi');
    expect(setsEqual(combineActiveNotes(holds, new Set([53])), new Set([53, 60]))).toBe(true);
    expect(buildSnapshotDiffKey(makeSnapshot({ isFrozen: true }))).not.toBe(
      buildSnapshotDiffKey(makeSnapshot({ isFrozen: false }))
    );

    const startSnap = makeSnapshot({
      beat: 0,
      loopStart: 0,
      playing: false,
      waitingNotes: [{ beat: 0, duration: 1, midi: 57, hand: 'L', role: 'root' }],
    });
    expect(shouldAutoStartOnPress(startSnap, false, 57)).toBe(true);
    expect(shouldAutoStartOnPress(startSnap, false, 60)).toBe(false);
    expect(shouldAutoStartOnPress(startSnap, true, 57)).toBe(false);
    expect(shouldAutoStartOnPress({ ...startSnap, beat: 2 }, false, 57)).toBe(false);
  });
});
