import { describe, it, expect, vi, afterEach } from 'vitest';
import { MidiFrameParser } from '../midiParser';
import { MidiManager } from '../MidiManager';
import type { ParsedMidiEvent, MidiStatus } from '../../types/midi';

interface MockResilientInput {
  name: string;
  state: 'connected' | 'disconnected';
  connection?: 'open' | 'closed' | 'pending';
  open?: () => Promise<void> | void;
  onmidimessage: ((msg: { data: Uint8Array }) => void) | null;
}

function mockMidiWithInputs(inputs: MockResilientInput[]) {
  const access = { inputs: { values: () => inputs.values() }, onstatechange: null as (() => void) | null };
  vi.stubGlobal('navigator', { requestMIDIAccess: async () => access });
  return access;
}

describe('MIDI resilience & edge recovery (#midi-resilience)', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('a) connect() flushes active notes and clears activeInputs prior to re-connection', async () => {
    const input: MockResilientInput = { name: 'K1', state: 'connected', onmidimessage: null };
    mockMidiWithInputs([input]);
    const mgr = new MidiManager();
    const events: ParsedMidiEvent[] = [];
    mgr.onEvent((e) => events.push(e));

    await mgr.connect();
    input.onmidimessage?.({ data: new Uint8Array([0x90, 60, 100]) });
    expect(events).toContainEqual({ type: 'noteOn', midi: 60, velocity: 100 / 127, rawMidi: 60 });

    events.length = 0;
    await mgr.connect();
    expect(events).toContainEqual({ type: 'noteOff', midi: 60, rawMidi: 60 });
    mgr.disconnect();
  });

  it('b) port with state connected and connection closed calls input.open() and receives 0x90', async () => {
    let connection: 'closed' | 'open' = 'closed';
    const openMock = vi.fn().mockImplementation(() => { connection = 'open'; });
    const input: MockResilientInput = {
      name: 'K2', state: 'connected',
      get connection() { return connection; },
      open: openMock, onmidimessage: null,
    };
    mockMidiWithInputs([input]);
    const mgr = new MidiManager();
    const events: ParsedMidiEvent[] = [];
    mgr.onEvent((e) => events.push(e));

    await mgr.connect();
    expect(openMock).toHaveBeenCalled();
    input.onmidimessage?.({ data: new Uint8Array([0x90, 64, 90]) });
    expect(events).toContainEqual({ type: 'noteOn', midi: 64, velocity: 90 / 127, rawMidi: 64 });
    mgr.disconnect();
  });

  it('c) ensureConnected() is non-destructive for open port, but recovers if closed or null', async () => {
    let connection: 'closed' | 'open' = 'open';
    const openMock = vi.fn().mockImplementation(() => { connection = 'open'; });
    const input: MockResilientInput = {
      name: 'K3', state: 'connected',
      get connection() { return connection; },
      open: openMock, onmidimessage: null,
    };
    mockMidiWithInputs([input]);
    const mgr = new MidiManager();
    const events: ParsedMidiEvent[] = [];
    mgr.onEvent((e) => events.push(e));

    await mgr.connect();
    input.onmidimessage?.({ data: new Uint8Array([0x90, 60, 100]) });
    events.length = 0;

    // Open port exists -> ensureConnected must NOT flush notes
    const ok1 = await mgr.ensureConnected();
    expect(ok1).toBe(true);
    expect(events).toHaveLength(0);

    // If port closed mid-flight, ensureConnected recovers it via open()
    connection = 'closed';
    const ok2 = await mgr.ensureConnected();
    expect(ok2).toBe(true);
    expect(openMock).toHaveBeenCalled();
    mgr.disconnect();
  });

  it('d) onmidimessage notifies activeCenterOffset shift -12 -> 0 and resetAutoCenter() resets it', async () => {
    const input: MockResilientInput = { name: 'K4', state: 'connected', onmidimessage: null };
    mockMidiWithInputs([input]);
    const mgr = new MidiManager();
    const statuses: MidiStatus[] = [];
    mgr.onStatusChange((s) => statuses.push(s));

    await mgr.connect();
    mgr.setAutoCenterOctave(true);

    input.onmidimessage?.({ data: new Uint8Array([0x90, 84, 100]) });
    expect(mgr.getStatus().activeCenterOffset).toBe(-12);

    statuses.length = 0;
    input.onmidimessage?.({ data: new Uint8Array([0x90, 48, 100]) });
    expect(mgr.getStatus().activeCenterOffset).toBe(0);
    expect(statuses.some((s) => s.activeCenterOffset === 0)).toBe(true);

    input.onmidimessage?.({ data: new Uint8Array([0x90, 84, 100]) });
    expect(mgr.getStatus().activeCenterOffset).toBe(-12);
    statuses.length = 0;
    mgr.resetAutoCenter();
    expect(mgr.getStatus().activeCenterOffset).toBe(0);
    expect(statuses.some((s) => s.activeCenterOffset === 0)).toBe(true);
    mgr.disconnect();
  });

  it('e) listener exception does not crash other listeners in emitEvents', async () => {
    const input: MockResilientInput = { name: 'K5', state: 'connected', onmidimessage: null };
    mockMidiWithInputs([input]);
    const mgr = new MidiManager();
    const events: ParsedMidiEvent[] = [];
    mgr.onEvent(() => { throw new Error('Faulty listener'); });
    mgr.onEvent((e) => events.push(e));

    await mgr.connect();
    expect(() => input.onmidimessage?.({ data: new Uint8Array([0x90, 60, 100]) })).not.toThrow();
    expect(events).toContainEqual({ type: 'noteOn', midi: 60, velocity: 100 / 127, rawMidi: 60 });
    mgr.disconnect();
  });

  it('f) MidiFrameParser ignores stale offset when returning to Octave 0 before setAutoCenter(true)', () => {
    const p1 = new MidiFrameParser();
    p1.parse(new Uint8Array([0x90, 84, 100])); // Octave +1 note
    p1.parse(new Uint8Array([0x90, 60, 100])); // Octave 0 note
    p1.setAutoCenter(true);
    expect(p1.getActiveCenterOffset()).toBe(0);

    const p2 = new MidiFrameParser();
    p2.parse(new Uint8Array([0x90, 84, 100]));
    p2.setAutoCenter(true);
    expect(p2.getActiveCenterOffset()).toBe(-12);
  });
});
