import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioEngine } from '../AudioEngine';

interface StubCtx {
  state: AudioContextState;
  currentTime: number;
  destination: object;
  onstatechange: (() => void) | null;
  resume: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  createOscillator: ReturnType<typeof vi.fn>;
  createGain: ReturnType<typeof vi.fn>;
  createBiquadFilter: ReturnType<typeof vi.fn>;
}

function installAudioStub() {
  const contexts: StubCtx[] = [];
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
    state: AudioContextState = 'suspended';
    currentTime = 0;
    destination = {};
    onstatechange: (() => void) | null = null;
    resume = vi.fn(async () => { this.state = 'running'; });
    close = vi.fn(async () => {});
    createOscillator = vi.fn(mkNode);
    createGain = vi.fn(mkNode);
    createBiquadFilter = vi.fn(mkNode);
    constructor() { contexts.push(this as unknown as StubCtx); }
  }

  vi.stubGlobal('window', { AudioContext: FakeAudioContext });
  return contexts;
}

describe('AudioEngine statechange & queued first note (#6)', () => {
  let contexts: StubCtx[];

  beforeEach(() => {
    vi.useFakeTimers();
    contexts = installAudioStub();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('notifies onStateChange on external running -> suspended transition without duplicates', async () => {
    const engine = new AudioEngine();
    const states: string[] = [];
    engine.setOnStateChange((s) => states.push(s));

    await engine.resume();
    expect(states).toEqual(['running']);

    contexts[0].state = 'suspended';
    contexts[0].onstatechange?.();
    contexts[0].onstatechange?.();
    expect(states).toEqual(['running', 'suspended']);
    expect(engine.getState()).toBe('suspended');
    engine.dispose();
  });

  it('queues first note while suspended and flushes it when resume() unlocks AudioContext', async () => {
    const engine = new AudioEngine();
    engine.noteOn(60, 0.8, false);
    expect(contexts[0].createOscillator).not.toHaveBeenCalled();

    await engine.resume();
    expect(contexts[0].createOscillator).toHaveBeenCalledTimes(2);
    engine.dispose();
  });

  it('plays briefly and fades out if noteOff arrives before async resume() resolves', async () => {
    const engine = new AudioEngine();
    engine.setSustainMode('MOMENTARY');
    engine.noteOn(64, 0.8, false);
    let resolveResume!: () => void;
    contexts[0].resume.mockImplementationOnce(() => new Promise<void>((res) => { resolveResume = res; }));

    const pending = engine.resume();
    engine.noteOff(64);
    contexts[0].state = 'running';
    resolveResume();
    await pending;

    expect(contexts[0].createOscillator).toHaveBeenCalledTimes(2);
    const osc = contexts[0].createOscillator.mock.results[0].value;
    expect(osc.stop).toHaveBeenCalled();
    engine.dispose();
  });

  it('drops stale queued notes older than 500 ms and clears queue if resume() fails', async () => {
    const engine = new AudioEngine();
    engine.noteOn(60, 0.8, false);
    vi.advanceTimersByTime(600);
    await engine.resume();
    expect(contexts[0].createOscillator).not.toHaveBeenCalled();
    engine.dispose();

    const engine2 = new AudioEngine();
    engine2.noteOn(62, 0.8, false);
    contexts[1].resume.mockRejectedValueOnce(new Error('NotAllowedError'));
    await expect(engine2.resume()).resolves.toBe('suspended');
    await engine2.resume();
    expect(contexts[1].createOscillator).not.toHaveBeenCalled();
    engine2.dispose();
  });

  it('notifies onVoiceChange after draining queued AUTO_ROOT note so sustained ring syncs', async () => {
    const engine = new AudioEngine();
    const onVoice = vi.fn();
    engine.setOnVoiceChange(onVoice);
    engine.noteOn(53, 0.8, false);
    engine.noteOff(53);

    await engine.resume();
    expect(onVoice).toHaveBeenCalledTimes(1);
    expect(engine.getSustainedNotes()).toEqual([53]);
    engine.dispose();
  });

  it('ignores stale resume() completion if AudioEngine was disposed mid-flight', async () => {
    const engine = new AudioEngine();
    engine.noteOn(60, 0.8, false);
    let resolveResume!: () => void;
    contexts[0].resume.mockImplementationOnce(() => new Promise<void>((res) => { resolveResume = res; }));
    const p = engine.resume();
    engine.dispose();

    const states: string[] = [];
    engine.setOnStateChange((s) => states.push(s));
    contexts[0].state = 'running';
    resolveResume();
    await expect(p).resolves.toBe('suspended');
    expect(states).toEqual([]);
  });
});
