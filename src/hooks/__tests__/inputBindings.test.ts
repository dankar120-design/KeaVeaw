import { describe, it, expect, vi, afterEach } from 'vitest';
import { bindPracticeInputs } from '../inputBindings';
import { MultiSourceHoldTracker } from '../practiceEffects';
import type { AudioEngine } from '../../engine/AudioEngine';
import type { MidiManager } from '../../engine/MidiManager';
import type { Transport } from '../../engine/Transport';

function setupBindings() {
  const listeners = new Map<string, (e: unknown) => void>();
  vi.stubGlobal('window', {
    addEventListener: (type: string, fn: (e: unknown) => void) => listeners.set(type, fn),
    removeEventListener: (type: string) => listeners.delete(type),
  });
  const pressNote = vi.fn();
  const setOctaveShift = vi.fn();
  const cleanup = bindPracticeInputs({
    midi: { onStatusChange: () => () => {}, onEvent: () => () => {}, connect: vi.fn(), disconnect: vi.fn() } as unknown as MidiManager,
    audio: { setSustainPedal: vi.fn(), noteOff: vi.fn(), dispose: vi.fn() } as unknown as AudioEngine,
    transport: { shiftLoop: vi.fn() } as unknown as Transport,
    holds: new MultiSourceHoldTracker(),
    heldQwerty: new Map(),
    octaveRef: { current: 0 },
    setMidiStatus: vi.fn(),
    setOctaveShift,
    pressNote,
    releaseNote: vi.fn(),
    syncVisualNotes: vi.fn(),
    togglePlay: vi.fn(),
    resetLoop: vi.fn(),
    cycleHand: vi.fn(),
    commitSnapshot: vi.fn(),
  });
  return { onKeyDown: listeners.get('keydown')!, pressNote, setOctaveShift, cleanup };
}

describe('bindPracticeInputs preventDefault & modifier guards (#1)', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('calls preventDefault on mapped Quote (B4) and KeyZ octave key without blocking INPUT/Ctrl', () => {
    const { onKeyDown, pressNote, setOctaveShift, cleanup } = setupBindings();

    const quotePrevent = vi.fn();
    onKeyDown({ code: 'Quote', repeat: false, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, target: null, preventDefault: quotePrevent, stopPropagation: vi.fn() });
    expect(quotePrevent).toHaveBeenCalledTimes(1);
    expect(pressNote).toHaveBeenCalledWith(71, 'qwerty', 0.8);

    const zPrevent = vi.fn();
    onKeyDown({ code: 'KeyZ', repeat: false, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, target: null, preventDefault: zPrevent, stopPropagation: vi.fn() });
    expect(zPrevent).toHaveBeenCalledTimes(1);
    expect(setOctaveShift).toHaveBeenCalledTimes(1);

    const inputPrevent = vi.fn();
    onKeyDown({ code: 'Quote', repeat: false, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, target: { tagName: 'INPUT' }, preventDefault: inputPrevent, stopPropagation: vi.fn() });
    expect(inputPrevent).not.toHaveBeenCalled();

    const ctrlPrevent = vi.fn();
    onKeyDown({ code: 'Quote', repeat: false, ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, target: null, preventDefault: ctrlPrevent, stopPropagation: vi.fn() });
    expect(ctrlPrevent).not.toHaveBeenCalled();
    expect(pressNote).toHaveBeenCalledTimes(1);

    cleanup();
  });
});
