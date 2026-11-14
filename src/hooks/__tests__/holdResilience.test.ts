import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MultiSourceHoldTracker } from '../practiceEffects';
import { bindPracticeInputs, InputBindingsDeps } from '../inputBindings';
import { usePracticeControls, PracticeControlDeps } from '../usePracticeControls';
import type { MidiManager } from '../../engine/MidiManager';
import type { AudioEngine } from '../../engine/AudioEngine';
import type { Transport } from '../../engine/Transport';

function makeInputDeps(midiOverrides: Record<string, unknown> = {}): InputBindingsDeps {
  return {
    midi: { onStatusChange: () => () => {}, onEvent: () => () => {}, connect: vi.fn(), disconnect: vi.fn(), ...midiOverrides } as unknown as MidiManager,
    audio: { setSustainPedal: vi.fn(), noteOff: vi.fn(), dispose: vi.fn() } as unknown as AudioEngine,
    transport: { shiftLoop: vi.fn() } as unknown as Transport,
    holds: new MultiSourceHoldTracker(), heldQwerty: new Map(), octaveRef: { current: 0 },
    setMidiStatus: vi.fn(), setOctaveShift: vi.fn(), pressNote: vi.fn(), releaseNote: vi.fn(),
    syncVisualNotes: vi.fn(), togglePlay: vi.fn(), resetLoop: vi.fn(), cycleHand: vi.fn(), commitSnapshot: vi.fn(),
  };
}

describe('holdResilience (#8)', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('verifies MultiSourceHoldTracker hasSource and press overlap contract', () => {
    const tracker = new MultiSourceHoldTracker();
    expect(tracker.hasSource(60, 'midi')).toBe(false);

    expect(tracker.press(60, 'midi')).toBe(true);
    expect(tracker.hasSource(60, 'midi')).toBe(true);
    expect(tracker.hasSource(60, 'pointer')).toBe(false);

    // DEC-006: overlapping hold returns false so tone is not re-triggered
    expect(tracker.press(60, 'pointer')).toBe(false);
    expect(tracker.hasSource(60, 'pointer')).toBe(true);

    expect(tracker.press(62, 'qwerty')).toBe(true);
    expect(tracker.hasSource(62, 'qwerty')).toBe(true);
  });

  it('binds focus and visibilitychange to midi.ensureConnected and cleans up cleanly', () => {
    const windowListeners = new Map<string, (e?: unknown) => void>();
    const docListeners = new Map<string, (e?: unknown) => void>();
    vi.stubGlobal('window', {
      addEventListener: (type: string, fn: (e?: unknown) => void) => windowListeners.set(type, fn),
      removeEventListener: (type: string) => windowListeners.delete(type),
    });
    const docMock = {
      visibilityState: 'visible',
      addEventListener: (type: string, fn: (e?: unknown) => void) => docListeners.set(type, fn),
      removeEventListener: (type: string) => docListeners.delete(type),
      activeElement: null,
    };
    vi.stubGlobal('document', docMock);

    const ensureConnected = vi.fn().mockResolvedValue(true);
    const cleanup = bindPracticeInputs(makeInputDeps({ ensureConnected }));

    const onFocus = windowListeners.get('focus');
    expect(onFocus).toBeDefined();
    onFocus?.();
    expect(ensureConnected).toHaveBeenCalledTimes(1);

    const onVisibility = docListeners.get('visibilitychange');
    expect(onVisibility).toBeDefined();
    docMock.visibilityState = 'hidden';
    onVisibility?.();
    expect(ensureConnected).toHaveBeenCalledTimes(1);
    docMock.visibilityState = 'visible';
    onVisibility?.();
    expect(ensureConnected).toHaveBeenCalledTimes(2);

    cleanup();
    expect(windowListeners.has('focus')).toBe(false);
    expect(docListeners.has('visibilitychange')).toBe(false);
  });

  it('runs bindPracticeInputs safely even when document is undefined', () => {
    const windowListeners = new Map<string, (e?: unknown) => void>();
    vi.stubGlobal('window', {
      addEventListener: (type: string, fn: (e?: unknown) => void) => windowListeners.set(type, fn),
      removeEventListener: (type: string) => windowListeners.delete(type),
    });
    vi.stubGlobal('document', undefined);

    const ensureConnected = vi.fn();
    const cleanup = bindPracticeInputs(makeInputDeps({ ensureConnected }));

    const onFocus = windowListeners.get('focus');
    expect(onFocus).toBeDefined();
    onFocus?.();
    expect(ensureConnected).toHaveBeenCalledTimes(1);
    expect(() => cleanup()).not.toThrow();
  });

  it('retryMidi releases stuck midi holds, silences audio, unlocks audio, and reconnects', () => {
    const holds = new MultiSourceHoldTracker();
    holds.press(60, 'midi');
    holds.press(64, 'midi');
    holds.press(64, 'pointer');

    const audioMock = { noteOff: vi.fn(), setSustainPedal: vi.fn() };
    const midiMock = { connect: vi.fn().mockResolvedValue(true) };
    const unlockAudio = vi.fn();
    const syncVisualNotes = vi.fn();

    const deps = {
      audioRef: { current: audioMock }, midiRef: { current: midiMock }, transportRef: { current: {} },
      playingRef: { current: false }, handRef: { current: 'BOTH' }, holdsRef: { current: holds },
      setSong: vi.fn(), setPlaying: vi.fn(), setBpm: vi.fn(), setHandIsolation: vi.fn(),
      setSustainMode: vi.fn(), unlockAudio, commitSnapshot: vi.fn(), syncVisualNotes,
    } as unknown as PracticeControlDeps;

    let controls!: ReturnType<typeof usePracticeControls>;
    renderToStaticMarkup(createElement(() => { controls = usePracticeControls(deps); return null; }));

    controls.retryMidi();

    expect(audioMock.noteOff).toHaveBeenCalledWith(60);
    expect(holds.getActiveMidis().has(64)).toBe(true);
    expect(holds.getActiveMidis().has(60)).toBe(false);
    expect(audioMock.setSustainPedal).toHaveBeenCalledWith(false);
    expect(unlockAudio).toHaveBeenCalledTimes(1);
    expect(syncVisualNotes).toHaveBeenCalledTimes(1);
    expect(midiMock.connect).toHaveBeenCalledTimes(1);
  });
});
