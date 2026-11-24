import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement, MutableRefObject } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { bindPracticeInputs } from '../inputBindings';
import { combineActiveNotes, MultiSourceHoldTracker } from '../practiceEffects';
import { usePracticeControls, PracticeControlDeps } from '../usePracticeControls';
import { detectChordName } from '../../utils/chordDetect';
import type { AudioEngine } from '../../engine/AudioEngine';
import type { MidiManager } from '../../engine/MidiManager';
import type { Transport } from '../../engine/Transport';
import type { HandIsolation, MidiStatus } from '../../types/midi';

describe('chordHoldsSync & releaseSource registerNoteOff hardening', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('increments MultiSourceHoldTracker.getVersion() only on actual held-set mutations', () => {
    const holds = new MultiSourceHoldTracker();
    expect(holds.getVersion()).toBe(0);
    holds.press(60, 'midi'); expect(holds.getVersion()).toBe(1);
    holds.press(60, 'midi'); expect(holds.getVersion()).toBe(1);
    holds.press(60, 'qwerty'); expect(holds.getVersion()).toBe(1);
    holds.release(60, 'midi'); expect(holds.getVersion()).toBe(1);
    holds.release(60, 'qwerty'); expect(holds.getVersion()).toBe(2);
    holds.release(60, 'qwerty'); expect(holds.getVersion()).toBe(2);
    holds.press(64, 'midi'); expect(holds.getVersion()).toBe(3);
    holds.releaseSource('midi'); expect(holds.getVersion()).toBe(4);
    holds.releaseSource('midi'); expect(holds.getVersion()).toBe(4);
    holds.press(67, 'pointer'); expect(holds.getVersion()).toBe(5);
    holds.clearAll(); expect(holds.getVersion()).toBe(6);
    holds.clearAll(); expect(holds.getVersion()).toBe(6);
  });

  it('forwards released MIDI and QWERTY/pointer holds to transport.registerNoteOff on disconnect and blur', () => {
    const listeners = new Map<string, (e: unknown) => void>();
    vi.stubGlobal('window', {
      addEventListener: (t: string, fn: (e: unknown) => void) => listeners.set(t, fn),
      removeEventListener: (t: string) => listeners.delete(t),
    });
    let onStatus!: (s: MidiStatus) => void;
    const registerNoteOff = vi.fn();
    const audioNoteOff = vi.fn();
    const syncVisualNotes = vi.fn();
    const holds = new MultiSourceHoldTracker();
    holds.press(60, 'midi'); holds.press(64, 'midi'); holds.press(67, 'qwerty');

    const unbind = bindPracticeInputs({
      midi: { onStatusChange: (cb: (s: MidiStatus) => void) => { onStatus = cb; return () => {}; }, onEvent: () => () => {}, connect: vi.fn(), disconnect: vi.fn() } as unknown as MidiManager,
      audio: { setSustainPedal: vi.fn(), noteOff: audioNoteOff, dispose: vi.fn() } as unknown as AudioEngine,
      transport: { shiftLoop: vi.fn(), registerNoteOff } as unknown as Transport,
      holds, heldQwerty: new Map([['KeyG', 67]]), octaveRef: { current: 0 },
      setMidiStatus: vi.fn(), setOctaveShift: vi.fn(), pressNote: vi.fn(), releaseNote: vi.fn(),
      syncVisualNotes, togglePlay: vi.fn(), resetLoop: vi.fn(), cycleHand: vi.fn(), commitSnapshot: vi.fn(),
    });

    onStatus({ supported: true, connected: false, deviceName: null, error: null, detectedOctaveOffset: 0, autoCenterOctave: true });
    expect(registerNoteOff).toHaveBeenCalledWith(60);
    expect(registerNoteOff).toHaveBeenCalledWith(64);
    expect(audioNoteOff).toHaveBeenCalledTimes(2);
    expect(syncVisualNotes).toHaveBeenCalledTimes(1);

    listeners.get('blur')!({});
    expect(registerNoteOff).toHaveBeenCalledWith(67);
    expect(audioNoteOff).toHaveBeenCalledWith(67);
    unbind();
  });

  it('calls transport.registerNoteOff in retryMidi when releasing held MIDI notes', () => {
    const holds = new MultiSourceHoldTracker();
    holds.press(60, 'midi');
    const registerNoteOff = vi.fn();
    const audioNoteOff = vi.fn();
    const deps: PracticeControlDeps = {
      audioRef: { current: { noteOff: audioNoteOff, setSustainPedal: vi.fn(), setSustainMode: vi.fn() } as unknown as AudioEngine },
      midiRef: { current: { connect: vi.fn() } as unknown as MidiManager },
      transportRef: { current: { registerNoteOff } as unknown as Transport },
      playingRef: { current: false } as MutableRefObject<boolean>,
      handRef: { current: 'BOTH' } as MutableRefObject<HandIsolation>,
      holdsRef: { current: holds },
      setSong: vi.fn(), setPlaying: vi.fn(), setBpm: vi.fn(), setHandIsolation: vi.fn(), setSustainMode: vi.fn(),
      unlockAudio: vi.fn(), commitSnapshot: vi.fn(), syncVisualNotes: vi.fn(),
    };
    renderToStaticMarkup(createElement(() => { usePracticeControls(deps).retryMidi(); return null; }));
    expect(registerNoteOff).toHaveBeenCalledWith(60);
    expect(audioNoteOff).toHaveBeenCalledWith(60);
  });

  it('keeps playedChord isolated from autoActive accompaniment notes', () => {
    const holds = new MultiSourceHoldTracker();
    const autoActive = new Set<number>([60, 64, 67]);
    expect(combineActiveNotes(holds, autoActive)).toEqual(new Set([60, 64, 67]));
    expect(detectChordName(holds.getActiveMidis())).toBeNull();
  });
});
