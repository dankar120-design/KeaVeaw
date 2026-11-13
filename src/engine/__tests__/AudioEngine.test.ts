import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioEngine } from '../AudioEngine';

function stubAudioContext() {
  const mkNode = () => ({
    type: '',
    frequency: { setValueAtTime: vi.fn() },
    gain: { value: 0.2, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null as (() => void) | null,
  });
  class FakeAudioContext {
    state: AudioContextState = 'running';
    currentTime = 0;
    destination = {};
    resume = vi.fn(async () => { this.state = 'running'; });
    close = vi.fn(async () => {});
    createOscillator = vi.fn(mkNode);
    createGain = vi.fn(mkNode);
    createBiquadFilter = vi.fn(mkNode);
  }
  vi.stubGlobal('window', { AudioContext: FakeAudioContext });
}

describe('AudioEngine decay & ghost-sustain guards', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stubAudioContext();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('prevents ghost sustain ring when key is held longer than 2850 ms decay', () => {
    const engine = new AudioEngine();
    const onChange = vi.fn();
    engine.setOnVoiceChange(onChange);

    engine.noteOn(60, 0.8, false);
    vi.advanceTimersByTime(2900); // decay timer stops voice while key is still held
    expect(onChange).toHaveBeenCalledTimes(1);

    engine.noteOff(60); // releasing expired key must NOT add a dead sustain ring
    expect(engine.getSustainedNotes()).toEqual([]);
    expect(engine.isSustainHeld()).toBe(false);
    engine.dispose();
  });

  it('clears sustained ring after timer expires and honors isSongMode AUTO_ROOT deferral', () => {
    const engine = new AudioEngine();
    const onChange = vi.fn();
    engine.setOnVoiceChange(onChange);

    engine.noteOn(53, 0.8, true); // F3 in song mode
    engine.noteOff(53);
    expect(engine.getSustainedNotes()).toEqual([53]);

    engine.noteOn(55, 0.8, true); // G3 in song mode must NOT clip F3 sustain
    engine.noteOff(55);
    expect(engine.getSustainedNotes().sort()).toEqual([53, 55]);

    vi.advanceTimersByTime(2900);
    expect(engine.getSustainedNotes()).toEqual([]);
    expect(onChange).toHaveBeenCalled();
    engine.dispose();
  });
});
