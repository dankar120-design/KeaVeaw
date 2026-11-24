import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MidiManager } from '../MidiManager';
import type { ParsedMidiEvent } from '../../types/midi';

interface HotplugMockInput {
  name: string;
  state: 'connected' | 'disconnected';
  connection?: 'open' | 'closed' | 'pending';
  open?: () => Promise<void> | void;
  onmidimessage: ((msg: { data: Uint8Array }) => void) | null;
}

const makeAccess = (getInputs: () => HotplugMockInput[]) => ({
  inputs: { values: () => getInputs().values() },
  onstatechange: null as (() => void) | null,
});
const openInput = (name = 'Keystation 32'): HotplugMockInput => ({ name, state: 'connected', connection: 'open', onmidimessage: null });

function makeClosedInput(name: string, failCount: number, delayMs = 0) {
  let conn: 'closed' | 'open' = 'closed';
  let tries = 0;
  const open = vi.fn(() => {
    tries += 1;
    if (tries <= failCount) return Promise.reject(new Error('Port busy'));
    if (!delayMs) { conn = 'open'; return Promise.resolve(); }
    return new Promise<void>((r) => setTimeout(() => { conn = 'open'; r(); }, delayMs));
  });
  const input: HotplugMockInput = { name, state: 'connected', get connection() { return conn; }, open, onmidimessage: null };
  return { input, open };
}

async function connectMgr(requestMIDIAccess: unknown, events?: ParsedMidiEvent[]) {
  vi.stubGlobal('navigator', { requestMIDIAccess });
  const mgr = new MidiManager();
  if (events) mgr.onEvent((e) => events.push(e));
  await mgr.connect();
  return mgr;
}

describe('USB-MIDI Hotplug & Auto-Reconnect', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('(a) retries closed port after 350ms when initial open() rejects and delivers noteOn', async () => {
    let inputs: HotplugMockInput[] = [];
    const access = makeAccess(() => inputs);
    const events: ParsedMidiEvent[] = [];
    const mgr = await connectMgr(vi.fn(async () => access), events);
    const { input, open } = makeClosedInput('Keystation Mini 32', 1);
    inputs = [input];
    access.onstatechange?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(open).toHaveBeenCalledTimes(1);
    expect(mgr.getStatus().connected).toBe(false);
    await vi.advanceTimersByTimeAsync(350);
    expect(open).toHaveBeenCalledTimes(2);
    expect(mgr.getStatus().connected).toBe(true);
    input.onmidimessage?.({ data: new Uint8Array([0x90, 60, 100]) });
    expect(events).toContainEqual({ type: 'noteOn', midi: 60, velocity: 100 / 127, rawMidi: 60 });
    mgr.disconnect();
  });

  it('(b) falls back to requestMIDIAccess() across multi-step 1s USB drop and reconnects', async () => {
    let inputs1: HotplugMockInput[] = [openInput()];
    const access1 = makeAccess(() => inputs1);
    const input2 = openInput();
    const requestMIDIAccess = vi.fn()
      .mockResolvedValueOnce(access1).mockResolvedValueOnce(makeAccess(() => [])).mockResolvedValueOnce(makeAccess(() => [input2]));
    const events: ParsedMidiEvent[] = [];
    const mgr = await connectMgr(requestMIDIAccess, events);
    expect(mgr.getStatus().connected).toBe(true);
    inputs1 = [];
    access1.onstatechange?.();
    expect(mgr.getStatus().connected).toBe(false);
    await vi.advanceTimersByTimeAsync(350);
    expect(requestMIDIAccess).toHaveBeenCalledTimes(2);
    expect(mgr.getStatus().connected).toBe(false);
    await vi.advanceTimersByTimeAsync(350);
    expect(requestMIDIAccess).toHaveBeenCalledTimes(3);
    expect(mgr.getStatus().connected).toBe(true);
    input2.onmidimessage?.({ data: new Uint8Array([0x90, 62, 100]) });
    expect(events).toContainEqual({ type: 'noteOn', midi: 62, velocity: 100 / 127, rawMidi: 62 });
    mgr.disconnect();
  });

  it('(c) schedules 0 timers and never re-polls requestMIDIAccess() when starting with no MIDI hardware', async () => {
    const requestMIDIAccess = vi.fn(async () => makeAccess(() => []));
    const mgr = await connectMgr(requestMIDIAccess);
    expect(mgr.getStatus().connected).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(5000);
    expect(requestMIDIAccess).toHaveBeenCalledTimes(1);
    mgr.disconnect();
  });

  it('(d) disconnect() cancels pending reconnect timer so no late connect() calls fire', async () => {
    let inputs: HotplugMockInput[] = [openInput()];
    const access = makeAccess(() => inputs);
    const requestMIDIAccess = vi.fn(async () => access);
    const mgr = await connectMgr(requestMIDIAccess);
    inputs = [];
    access.onstatechange?.();
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    mgr.disconnect();
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(5000);
    expect(requestMIDIAccess).toHaveBeenCalledTimes(1);
  });

  it('(e) does not abort async 20ms open() during retry with premature requestMIDIAccess()', async () => {
    const { input, open } = makeClosedInput('Keystation 32', 1, 20);
    const requestMIDIAccess = vi.fn(async () => makeAccess(() => [input]));
    const mgr = await connectMgr(requestMIDIAccess);
    await vi.advanceTimersByTimeAsync(0);
    expect(open).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(350);
    expect(open).toHaveBeenCalledTimes(2);
    expect(requestMIDIAccess).toHaveBeenCalledTimes(1);
    expect(mgr.getStatus().connected).toBe(false);
    await vi.advanceTimersByTimeAsync(20);
    expect(requestMIDIAccess).toHaveBeenCalledTimes(1);
    expect(mgr.getStatus().connected).toBe(true);
    mgr.disconnect();
  });

  it('(f) recovers via ensureConnected() after 5 failed retries (>1750ms) and resets reconnect series', async () => {
    let inputs1: HotplugMockInput[] = [openInput()];
    const access1 = makeAccess(() => inputs1);
    const accessEmpty = makeAccess(() => []);
    const { input: input2 } = makeClosedInput('Keystation 32', 1);
    const requestMIDIAccess = vi.fn()
      .mockResolvedValueOnce(access1).mockResolvedValueOnce(accessEmpty).mockResolvedValueOnce(accessEmpty)
      .mockResolvedValueOnce(accessEmpty).mockResolvedValueOnce(accessEmpty).mockResolvedValueOnce(accessEmpty)
      .mockResolvedValueOnce(makeAccess(() => [input2]));
    const mgr = await connectMgr(requestMIDIAccess);
    inputs1 = [];
    access1.onstatechange?.();
    await vi.advanceTimersByTimeAsync(2000);
    expect(requestMIDIAccess).toHaveBeenCalledTimes(6);
    expect(mgr.getStatus().connected).toBe(false);
    await mgr.ensureConnected();
    expect(requestMIDIAccess).toHaveBeenCalledTimes(7);
    await vi.advanceTimersByTimeAsync(350);
    expect(mgr.getStatus().connected).toBe(true);
    mgr.disconnect();
  });
});
