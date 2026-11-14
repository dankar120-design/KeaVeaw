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
    vi.advanceTimersByTime(2900);
    expect(onChange).toHaveBeenCalledTimes(1);

    engine.noteOff(60);
    expect(engine.getSustainedNotes()).toEqual([]);
    expect(engine.isSustainHeld()).toBe(false);
    engine.dispose();
  });

  it('clears sustained ring after timer expires and honors isSongMode AUTO_ROOT deferral', () => {
    const engine = new AudioEngine();
    const onChange = vi.fn();
    engine.setOnVoiceChange(onChange);

    engine.noteOn(53, 0.8, true);
    engine.noteOff(53);
    expect(engine.getSustainedNotes()).toEqual([53]);

    engine.noteOn(55, 0.8, true);
    engine.noteOff(55);
    expect(engine.getSustainedNotes().sort()).toEqual([53, 55]);

    vi.advanceTimersByTime(2900);
    expect(engine.getSustainedNotes()).toEqual([]);
    expect(onChange).toHaveBeenCalled();
    engine.dispose();
  });

  it('defaults to epiano preset and updates preset state', () => {
    const engine = new AudioEngine();
    expect(engine.getPreset()).toBe('epiano');
    engine.setPreset('bell');
    expect(engine.getPreset()).toBe('bell');
    engine.setPreset('warm_pad');
    expect(engine.getPreset()).toBe('warm_pad');
    engine.dispose();
  });

  it('creates bell and warm_pad voices with distinct synthesis parameters and cleans decay', () => {
    const engine = new AudioEngine();
    const onChange = vi.fn();
    engine.setOnVoiceChange(onChange);

    engine.setPreset('bell');
    engine.noteOn(69, 0.8);
    const ctx = (engine as unknown as { ctx: { createOscillator: ReturnType<typeof vi.fn>; createBiquadFilter: ReturnType<typeof vi.fn>; createGain: ReturnType<typeof vi.fn> } }).ctx;
    const osc1Bell = ctx.createOscillator.mock.results[0].value;
    const osc2Bell = ctx.createOscillator.mock.results[1].value;
    const filterBell = ctx.createBiquadFilter.mock.results[0].value;
    const subGainBell = ctx.createGain.mock.results[0].value;
    const mainGainBell = ctx.createGain.mock.results[1].value;

    expect(osc1Bell.type).toBe('sine');
    expect(osc2Bell.type).toBe('sine');
    expect(osc2Bell.frequency.setValueAtTime).toHaveBeenCalledWith(440 * 3, 0);
    expect(subGainBell.gain.setValueAtTime).toHaveBeenCalledWith(0.35, 0);
    expect(filterBell.frequency.setValueAtTime).toHaveBeenCalledWith(Math.min(6400, 440 * 7.5), 0);
    expect(mainGainBell.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.8 * 0.18, 0.003);

    engine.setPreset('warm_pad');
    engine.noteOn(69, 0.8);
    const osc1Pad = ctx.createOscillator.mock.results[2].value;
    const osc2Pad = ctx.createOscillator.mock.results[3].value;
    const filterPad = ctx.createBiquadFilter.mock.results[1].value;
    const subGainPad = ctx.createGain.mock.results[2].value;
    const mainGainPad = ctx.createGain.mock.results[3].value;

    expect(osc1Pad.type).toBe('triangle');
    expect(osc2Pad.frequency.setValueAtTime).toHaveBeenCalledWith(440 * 0.5, 0);
    expect(subGainPad.gain.setValueAtTime).toHaveBeenCalledWith(0.28, 0);
    expect(filterPad.frequency.setValueAtTime).toHaveBeenCalledWith(Math.min(1800, 440 * 2.8), 0);
    expect(mainGainPad.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.8 * 0.14, 0.035);

    vi.advanceTimersByTime(2900);
    expect(onChange).toHaveBeenCalled();
    engine.dispose();
  });

  it('synchronously stops voices and disconnects nodes on dispose without scheduling fades', () => {
    const engine = new AudioEngine();
    engine.noteOn(60, 0.8);
    const ctx = (engine as unknown as { ctx: { createOscillator: ReturnType<typeof vi.fn>; createGain: ReturnType<typeof vi.fn> } }).ctx;
    const osc1 = ctx.createOscillator.mock.results[0].value;
    const osc2 = ctx.createOscillator.mock.results[1].value;
    const mainGain = ctx.createGain.mock.results[1].value;

    engine.dispose();

    expect(osc1.stop).toHaveBeenCalledWith();
    expect(osc2.stop).toHaveBeenCalledWith();
    expect(osc1.disconnect).toHaveBeenCalled();
    expect(osc2.disconnect).toHaveBeenCalled();
    expect(mainGain.gain.exponentialRampToValueAtTime).toHaveBeenCalledTimes(2);
  });
});
